/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  fetchDocument,
  indexDocument,
  putIngest,
} from './helpers/requests';

// OTEL metrics data streams do NOT have a default_pipeline set on their write indices
// out-of-the-box (unlike logs). Streams must explicitly call updateDefaultIngestPipeline
// for each new stream.
//
// This test reproduces https://github.com/elastic/kibana/issues/269984:
// when a second classic stream shares the same template-level pipeline (because it matches
// the same index template), the first stream's setup creates the pipeline and correctly
// sets default_pipeline on its write index. But the second stream's write index never gets
// index.default_pipeline set — so documents bypass processing entirely.
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  const stream1 = 'metrics-hostmetricsreceiver.otel-default';
  const stream2 = 'metrics-kubeletstatsreceiver.otel-default';

  let apiClient: StreamsSupertestRepositoryClient;

  describe('OTEL metrics classic streams - processing applied to second stream', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      // Seed both streams so their write indices exist before we add processing.
      // OTEL metrics use resource.attributes.* for resource-level fields.
      await indexDocument(esClient, stream1, {
        '@timestamp': new Date().toISOString(),
        'resource.attributes.host.name': 'node1',
      });
      await indexDocument(esClient, stream2, {
        '@timestamp': new Date().toISOString(),
        'resource.attributes.host.name': 'node2',
      });
    });

    after(async () => {
      for (const stream of [stream1, stream2]) {
        await esClient.indices.deleteDataStream({ name: stream }).catch(() => {});
      }
      // Remove the Streams-managed ingest pipelines so subsequent runs start clean.
      // The template-level pipeline persists across disableStreams and would cause
      // the test to see processors already present, bypassing the update_default_ingest_pipeline
      // code path that this test exercises.
      await esClient.ingest
        .deletePipeline({ id: 'metrics-otel@template-pipeline' })
        .catch(() => {});
      await esClient.ingest.deletePipeline({ id: `${stream1}@stream.processing` }).catch(() => {});
      await esClient.ingest.deletePipeline({ id: `${stream2}@stream.processing` }).catch(() => {});
      await disableStreams(apiClient);
    });

    it('applies processing to the second OTEL metrics stream when the template pipeline already exists', async () => {
      const baseIngest = {
        lifecycle: { inherit: {} },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      };

      // --- Step 1: add processing to the FIRST stream ---
      // This creates the shared template-level pipeline (metrics-otel@template-pipeline)
      // and sets index.default_pipeline on stream1's write index.
      await putIngest(apiClient, stream1, {
        ingest: {
          ...baseIngest,
          processing: {
            steps: [{ action: 'set', to: 'attributes.stream_origin', value: 'stream1' }],
          },
        },
      });

      // --- Step 2: add processing to the SECOND stream ---
      // The template-level pipeline now already exists (streams-managed). Before the fix,
      // updateExistingStreamsManagedPipeline would NOT emit update_default_ingest_pipeline
      // for stream2's write index, so the set processor was silently skipped.
      await putIngest(apiClient, stream2, {
        ingest: {
          ...baseIngest,
          processing: {
            steps: [{ action: 'set', to: 'attributes.stream_origin', value: 'stream2' }],
          },
        },
      });

      // --- Step 3: index a doc into the SECOND stream and verify the processor ran ---
      const response = await indexDocument(esClient, stream2, {
        '@timestamp': new Date().toISOString(),
        'resource.attributes.host.name': 'node3',
      });

      const hit = await fetchDocument(esClient, stream2, response._id);
      const source = hit._source as Record<string, Record<string, unknown>>;

      // If the write index never had default_pipeline set, the field will be absent.
      // The `set` processor writes into the `attributes` object (OTEL custom namespace).
      expect(source.attributes?.stream_origin).to.eql('stream2');
    });
  });
}
