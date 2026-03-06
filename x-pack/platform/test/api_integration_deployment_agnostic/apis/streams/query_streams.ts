/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getEsqlViewName, emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import type { Client } from '@elastic/elasticsearch';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  forkStream,
  getStream,
  indexAndAssertTargetStream,
  indexDocument,
  putStream,
} from './helpers/requests';

/**
 * Helper to create a query stream upsert request
 */
function createQueryStreamRequest(
  esql: string,
  viewName: string
): Streams.QueryStream.UpsertRequest {
  return {
    stream: {
      description: '',
      query: {
        view: viewName,
        esql,
      },
    },
    ...emptyAssets,
  };
}

/**
 * Helper to create an ES|QL view (simulating wired stream views that will land soon)
 */
async function createEsqlView(esClient: Client, viewName: string, query: string): Promise<void> {
  await esClient.transport.request({
    method: 'PUT',
    path: `/_query/view/${viewName}`,
    body: { query },
  });
}

/**
 * Helper to delete an ES|QL view
 */
async function deleteEsqlView(esClient: Client, viewName: string): Promise<void> {
  try {
    await esClient.transport.request({
      method: 'DELETE',
      path: `/_query/view/${viewName}`,
    });
  } catch {
    // Ignore if view doesn't exist
  }
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es') as unknown as Client;

  let apiClient: StreamsSupertestRepositoryClient;

  const PARENT_STREAM_NAME = 'logs.otel.query-test';

  describe('Query Streams', function () {
    this.tags(['skipCloud', 'skipMKI', 'skipServerless']); // Whilst the views APIs aren't available

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      // Enable query streams feature flag
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: true,
      });

      await forkStream(apiClient, 'logs.otel', {
        stream: { name: PARENT_STREAM_NAME },
        where: { field: 'attributes.test.type', eq: 'query-stream-test' },
      });

      await indexAndAssertTargetStream(esClient, PARENT_STREAM_NAME, {
        '@timestamp': new Date().toISOString(),
        message: JSON.stringify({
          '@timestamp': new Date().toISOString(),
          'log.level': 'info',
          message: 'test document for query stream validation',
          'test.type': 'query-stream-test',
        }),
      });

      // Create ES|QL view for the wired stream (simulating upcoming feature)
      // Wired streams will have views created automatically in the future: https://github.com/elastic/streams-program/issues/756
      const parentViewName = getEsqlViewName(PARENT_STREAM_NAME);
      await createEsqlView(esClient, parentViewName, `FROM ${PARENT_STREAM_NAME}`);
    });

    after(async () => {
      // Clean up ES|QL views
      await deleteEsqlView(esClient, getEsqlViewName(PARENT_STREAM_NAME));

      // Clean up streams
      try {
        await deleteStream(apiClient, `${PARENT_STREAM_NAME}.errors`);
      } catch {
        // Ignore if already deleted or doesn't exist
      }
      await deleteStream(apiClient, PARENT_STREAM_NAME);
      await disableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: false,
      });
    });

    describe('Parent view reference validation', () => {
      it('should reject child query stream that does not reference parent stream', async () => {
        const childName = `${PARENT_STREAM_NAME}.errors`;
        const childViewName = getEsqlViewName(childName);
        const parentViewName = getEsqlViewName(PARENT_STREAM_NAME);

        // Try to create a child query stream that references a different source
        const response = (await putStream(
          apiClient,
          childName,
          createQueryStreamRequest(
            'FROM some-other-index | WHERE log.level == "error"',
            childViewName
          ),
          400 // Expect validation error
        )) as unknown as { message: string };

        expect(response.message).to.contain('must reference its parent stream');
        // Parent is a wired stream, so it should be referenced by ES|QL view name
        expect(response.message).to.contain(parentViewName);
      });

      it('should accept child query stream that correctly references parent wired stream', async () => {
        const childName = `${PARENT_STREAM_NAME}.errors`;
        const childViewName = getEsqlViewName(childName);
        const parentViewName = getEsqlViewName(PARENT_STREAM_NAME);

        // Create a child query stream that correctly references the parent wired stream
        // Wired streams are referenced by their ES|QL view name ($.parent-name)
        const response = await putStream(
          apiClient,
          childName,
          createQueryStreamRequest(
            `FROM ${parentViewName} | WHERE log.level == "error"`,
            childViewName
          ),
          200
        );

        expect(response).to.have.property('acknowledged', true);

        // Verify the query stream was created
        const queryStream = (await getStream(
          apiClient,
          childName
        )) as Streams.QueryStream.GetResponse;
        expect(queryStream.stream.query.view).to.equal(childViewName);
      });

      it('should reject query stream without FROM clause', async () => {
        const childName = `${PARENT_STREAM_NAME}.info`;
        const childViewName = getEsqlViewName(childName);
        const parentViewName = getEsqlViewName(PARENT_STREAM_NAME);

        // Try to create a child query stream without a FROM clause
        const response = (await putStream(
          apiClient,
          childName,
          createQueryStreamRequest('SHOW INFO', childViewName),
          400 // Expect validation error
        )) as unknown as { message: string };

        expect(response.message).to.contain('must have a FROM clause');
        // Parent is a wired stream, so it should be referenced by ES|QL view name
        expect(response.message).to.contain(parentViewName);
      });

      it('should allow root-level query stream without parent view reference', async () => {
        const rootQueryStreamName = 'root-query-stream';
        const rootViewName = getEsqlViewName(rootQueryStreamName);

        // Root-level streams are not subject to parent view validation
        // However, they still need a valid ES|QL query that can be executed
        // This test verifies that root-level streams don't fail the parent view validation
        const response = await putStream(
          apiClient,
          rootQueryStreamName,
          createQueryStreamRequest('FROM logs.otel | LIMIT 10', rootViewName),
          200 // Should succeed (no parent view validation for root streams)
        );

        expect(response).to.have.property('acknowledged', true);

        // Clean up
        await deleteStream(apiClient, rootQueryStreamName);
      });

      it('should reject child referencing grandparent instead of immediate parent', async () => {
        // First create an intermediate query stream (child of wired parent)
        const intermediateChildName = `${PARENT_STREAM_NAME}.intermediate`;
        const intermediateViewName = getEsqlViewName(intermediateChildName);
        const parentViewName = getEsqlViewName(PARENT_STREAM_NAME);
        const grandchildName = `${PARENT_STREAM_NAME}.intermediate.grandchild`;
        const grandchildViewName = getEsqlViewName(grandchildName);

        // Create intermediate child with correct parent reference (wired stream = ES|QL view name)
        await putStream(
          apiClient,
          intermediateChildName,
          createQueryStreamRequest(
            `FROM ${parentViewName} | WHERE log.level == "info"`,
            intermediateViewName
          )
        );

        // Try to create grandchild referencing grandparent instead of immediate parent
        // The intermediate is a query stream, so grandchild should reference its view
        const response = (await putStream(
          apiClient,
          grandchildName,
          createQueryStreamRequest(
            // Referencing grandparent view ($.logs.query-test) instead of parent view ($.logs.query-test.intermediate)
            `FROM ${parentViewName} | WHERE log.level == "debug"`,
            grandchildViewName
          ),
          400 // Expect validation error
        )) as unknown as { message: string };

        expect(response.message).to.contain('must reference its parent stream');
        // Parent is a query stream, so it should be referenced by view name
        expect(response.message).to.contain(intermediateViewName);

        // Clean up intermediate stream
        await deleteStream(apiClient, intermediateChildName);
      });
    });

    describe('Classic stream parent validation', () => {
      const CLASSIC_PARENT_NAME = 'logs-classic-query-test-default';

      const classicStreamBody: Streams.ClassicStream.UpsertRequest = {
        stream: {
          description: 'Classic stream for query stream validation',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
      };

      before(async () => {
        // Create a classic stream by indexing a document first (creates the data stream)
        await indexDocument(esClient, CLASSIC_PARENT_NAME, {
          '@timestamp': new Date().toISOString(),
          message: 'test document for classic stream query validation',
          'log.level': 'error',
        });

        // Store the classic stream definition in the .streams index
        await putStream(apiClient, CLASSIC_PARENT_NAME, classicStreamBody);
      });

      after(async () => {
        // Clean up classic stream children
        try {
          await deleteStream(apiClient, `${CLASSIC_PARENT_NAME}.errors`);
        } catch {
          // Ignore if doesn't exist
        }
        // Delete the classic stream and data stream
        try {
          await deleteStream(apiClient, CLASSIC_PARENT_NAME);
        } catch {
          // Ignore if doesn't exist
        }
        try {
          await esClient.indices.deleteDataStream({ name: CLASSIC_PARENT_NAME });
        } catch {
          // Ignore if doesn't exist
        }
      });

      it('should reject child query stream that does not reference classic parent', async () => {
        const childName = `${CLASSIC_PARENT_NAME}.errors`;
        const childViewName = getEsqlViewName(childName);

        // Try to create a child query stream that references a different source
        const response = (await putStream(
          apiClient,
          childName,
          createQueryStreamRequest(
            'FROM some-other-index | WHERE log.level == "error"',
            childViewName
          ),
          400 // Expect validation error
        )) as unknown as { message: string };

        expect(response.message).to.contain('must reference its parent stream');
        // Parent is a classic stream, so it should be referenced by data stream name (not view)
        expect(response.message).to.contain(CLASSIC_PARENT_NAME);
        // Should NOT contain the view prefix for classic streams
        expect(response.message).to.not.contain(`$.${CLASSIC_PARENT_NAME}`);
      });

      it('should accept child query stream that correctly references classic parent by data stream name', async () => {
        const childName = `${CLASSIC_PARENT_NAME}.errors`;
        const childViewName = getEsqlViewName(childName);

        // Create a child query stream that correctly references the classic parent
        // Classic streams are referenced by their data stream name (NOT ES|QL view)
        const response = await putStream(
          apiClient,
          childName,
          createQueryStreamRequest(
            `FROM ${CLASSIC_PARENT_NAME} | WHERE log.level == "error"`,
            childViewName
          ),
          200
        );

        expect(response).to.have.property('acknowledged', true);

        // Verify the query stream was created
        const queryStream = (await getStream(
          apiClient,
          childName
        )) as Streams.QueryStream.GetResponse;
        expect(queryStream.stream.query.view).to.equal(childViewName);
      });

      it('should reject child query stream that incorrectly uses ES|QL view for classic parent', async () => {
        const childName = `${CLASSIC_PARENT_NAME}.info`;
        const childViewName = getEsqlViewName(childName);
        const incorrectViewReference = getEsqlViewName(CLASSIC_PARENT_NAME);

        // Try to create a child query stream using ES|QL view syntax for classic parent
        // This should fail because classic streams don't have ES|QL views
        const response = (await putStream(
          apiClient,
          childName,
          createQueryStreamRequest(
            `FROM ${incorrectViewReference} | WHERE log.level == "info"`,
            childViewName
          ),
          400 // Expect validation error
        )) as unknown as { message: string };

        expect(response.message).to.contain('must reference its parent stream');
        // Error should indicate the correct reference format (data stream name)
        expect(response.message).to.contain(CLASSIC_PARENT_NAME);
      });
    });
  });
}
