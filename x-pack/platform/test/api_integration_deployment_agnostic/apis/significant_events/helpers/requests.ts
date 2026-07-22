/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import type { SearchTotalHits, Refresh } from '@elastic/elasticsearch/lib/api/types';
import type { BaseFeature, Feature } from '@kbn/significant-events-schema';
import type { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import type { SignificantEventsRouteRepository } from '@kbn/significant-events-plugin/server';
import type { SignificantEventsSupertestRepositoryClient } from './repository_client';

// ---------------------------------------------------------------------------
// Elasticsearch resource helpers
// ---------------------------------------------------------------------------

export interface EsqlView {
  name: string;
  query: string;
}

export async function getEsqlView(esClient: Client, viewName: string): Promise<EsqlView> {
  const encoded = encodeURIComponent(viewName);
  const response = await esClient.transport.request<{ views: EsqlView[] }>({
    method: 'GET',
    path: `/_query/view/${encoded}`,
  });
  return response.views[0];
}

export async function createEsqlView(
  esClient: Client,
  viewName: string,
  query: string
): Promise<void> {
  const encoded = encodeURIComponent(viewName);
  await esClient.transport.request({
    method: 'PUT',
    path: `/_query/view/${encoded}`,
    body: { query },
  });
}

export async function deleteEsqlView(esClient: Client, viewName: string): Promise<void> {
  const encoded = encodeURIComponent(viewName);
  try {
    await esClient.transport.request({
      method: 'DELETE',
      path: `/_query/view/${encoded}`,
    });
  } catch {
    // Ignore if view doesn't exist
  }
}

export async function esqlViewExists(esClient: Client, viewName: string): Promise<boolean> {
  const encoded = encodeURIComponent(viewName);
  return esClient.transport
    .request({ method: 'GET', path: `/_query/view/${encoded}` })
    .then(() => true)
    .catch(() => false);
}

export async function dataStreamExists(esClient: Client, name: string): Promise<boolean> {
  return esClient.indices
    .getDataStream({ name })
    .then(() => true)
    .catch(() => false);
}

export async function ingestPipelineExists(esClient: Client, id: string): Promise<boolean> {
  return esClient.ingest
    .getPipeline({ id })
    .then(() => true)
    .catch(() => false);
}

export async function componentTemplateExists(esClient: Client, name: string): Promise<boolean> {
  return esClient.cluster
    .getComponentTemplate({ name })
    .then((r) => r.component_templates.length > 0)
    .catch(() => false);
}

export async function indexTemplateExists(esClient: Client, name: string): Promise<boolean> {
  return esClient.indices
    .getIndexTemplate({ name })
    .then((r) => r.index_templates.length > 0)
    .catch(() => false);
}

export async function indexDocument(
  esClient: Client,
  index: string,
  document: JsonObject,
  refresh: Refresh = 'wait_for'
) {
  const response = await esClient.index({ index, document, refresh });
  return response;
}

export async function executeEsql(
  esClient: Client,
  query: string
): Promise<{ columns: Array<{ name: string; type: string }>; values: unknown[][] }> {
  const response = await esClient.transport.request<{
    columns: Array<{ name: string; type: string }>;
    values: unknown[][];
  }>({
    method: 'POST',
    path: '/_query',
    body: { query },
  });
  return response;
}

export async function indexAndAssertTargetStream(
  esClient: Client,
  target: string,
  document: JsonObject
) {
  // Determine which root stream to index to based on the target
  // - If target is logs.otel or starts with logs.otel., index to logs.otel
  // - If target is logs.ecs or starts with logs.ecs., index to logs.ecs
  // - Otherwise, index to logs (for legacy streams or migration scenarios)
  let indexTarget = 'logs';
  if (target === 'logs.otel' || target.startsWith('logs.otel.')) {
    indexTarget = 'logs.otel';
  } else if (target === 'logs.ecs' || target.startsWith('logs.ecs.')) {
    indexTarget = 'logs.ecs';
  }

  const response = await esClient.index({ index: indexTarget, document, refresh: 'wait_for' });
  const result = await fetchDocument(esClient, target, response._id);
  expect(result._index).to.match(new RegExp(`^\.ds\-${target}-.*`));
  return result;
}

export async function fetchDocument(esClient: Client, index: string, id: string) {
  const query = {
    ids: { values: [id] },
  };
  const response = await esClient.search({ index, query });
  expect((response.hits.total as SearchTotalHits).value).to.eql(1);
  return response.hits.hits[0];
}

/**
 * Lists the significant-event queries attached to a stream via the dedicated queries API.
 * Queries are no longer part of the stream GET response, so tests read them through here.
 */
export async function getQueries(
  apiClient: SignificantEventsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /api/streams/{name}/queries 2023-10-31', {
      params: {
        path: { name },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

/**
 * Bulk-applies significant-event query operations (index/delete) to a stream via the dedicated
 * queries API. Queries are no longer part of the stream upsert, so tests seed them through here.
 */
export async function bulkQueries(
  apiClient: SignificantEventsSupertestRepositoryClient,
  name: string,
  operations: ClientRequestParamsOf<
    SignificantEventsRouteRepository,
    'POST /api/streams/{name}/queries/_bulk 2023-10-31'
  >['params']['body']['operations'],
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
      params: {
        path: { name },
        body: { operations },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function upsertFeature(
  client: SignificantEventsSupertestRepositoryClient,
  streamName: string,
  feature: BaseFeature,
  expectedStatusCode = 200
): Promise<{ id: string; uuid: string }> {
  await client
    .fetch('POST /internal/streams/{name}/features', {
      params: {
        path: { name: streamName },
        body: feature,
      },
    })
    .expect(expectedStatusCode);

  const { features } = await listFeatures(client, streamName);
  const created = features.find((f) => f.id === feature.id);

  if (!created) {
    throw new Error(`Feature with id "${feature.id}" not found after upsert`);
  }

  return { id: created.id, uuid: created.uuid };
}

export async function listFeatures(
  client: SignificantEventsSupertestRepositoryClient,
  streamName: string,
  opts?: { includeExcluded?: boolean },
  expectedStatusCode = 200
) {
  return client
    .fetch('GET /internal/streams/{name}/features', {
      params: {
        path: { name: streamName },
        query: opts?.includeExcluded ? { include_excluded: true } : undefined,
      },
    })
    .expect(expectedStatusCode)
    .then((response) => response.body as { features: Feature[] });
}

export async function bulkFeatures(
  client: SignificantEventsSupertestRepositoryClient,
  streamName: string,
  operations: Array<
    | { index: { feature: Feature } }
    | { delete: { id: string } }
    | { exclude: { id: string } }
    | { restore: { id: string } }
  >,
  expectedStatusCode = 200
) {
  return client
    .fetch('POST /internal/streams/{name}/features/_bulk', {
      params: {
        path: { name: streamName },
        body: { operations },
      },
    })
    .expect(expectedStatusCode)
    .then((response) => response.body as { acknowledged: boolean });
}

export async function deleteFeature(
  client: SignificantEventsSupertestRepositoryClient,
  streamName: string,
  id: string,
  expectedStatusCode = 200
) {
  return client
    .fetch('DELETE /internal/streams/{name}/features/{id}', {
      params: {
        path: { name: streamName, id },
      },
    })
    .expect(expectedStatusCode)
    .then((response) => response.body as { acknowledged: boolean });
}
