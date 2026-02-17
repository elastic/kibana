/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import type { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import type { SearchTotalHits, Refresh } from '@elastic/elasticsearch/lib/api/types';
import type { Streams } from '@kbn/streams-schema';
import type { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import type { ContentPackIncludedObjects, ContentPackManifest } from '@kbn/content-packs-schema';
import type { StreamsSupertestRepositoryClient } from './repository_client';

export async function enableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_enable 2023-10-31').expect(200);
}

export async function disableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_disable 2023-10-31').expect(200);
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

export async function indexAndAssertTargetStream(
  esClient: Client,
  target: string,
  document: JsonObject
) {
  const response = await esClient.index({ index: 'logs', document, refresh: 'wait_for' });
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

export async function forkStream(
  client: StreamsSupertestRepositoryClient,
  root: string,
  body: ClientRequestParamsOf<
    StreamsRouteRepository,
    'POST /api/streams/{name}/_fork 2023-10-31'
  >['params']['body'],
  expectedStatusCode: number = 200
) {
  return client
    .fetch(`POST /api/streams/{name}/_fork 2023-10-31`, {
      params: {
        path: {
          name: root,
        },
        body,
      },
    })
    .expect(expectedStatusCode)
    .then((response) => response.body);
}

export async function putStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: Streams.all.UpsertRequest,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('PUT /api/streams/{name} 2023-10-31', {
      params: {
        path: {
          name,
        },
        body,
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /api/streams/{name} 2023-10-31', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function deleteStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getIlmStats(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /internal/streams/{name}/lifecycle/_stats', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getFailureStoreStats(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /internal/streams/{name}/failure_store/stats', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getQueries(
  apiClient: StreamsSupertestRepositoryClient,
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

export async function linkAttachment(options: {
  apiClient: StreamsSupertestRepositoryClient;
  stream: string;
  type: AttachmentType;
  id: string;
  expectedStatusCode?: number;
  spaceId?: string;
}) {
  const { apiClient, stream, type, id, expectedStatusCode = 200, spaceId } = options;

  const baseEndpoint =
    'PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31';
  const endpoint = spaceId
    ? (baseEndpoint.replace('/api/', `/s/${spaceId}/api/`) as typeof baseEndpoint)
    : baseEndpoint;

  const response = await apiClient.fetch(endpoint, {
    params: { path: { streamName: stream, attachmentType: type, attachmentId: id } },
  });

  expect(response.status).to.be(expectedStatusCode);
  return response.body;
}

export async function unlinkAttachment(options: {
  apiClient: StreamsSupertestRepositoryClient;
  stream: string;
  type: AttachmentType;
  id: string;
  expectedStatusCode?: number;
  spaceId?: string;
}) {
  const { apiClient, stream, type, id, expectedStatusCode = 200, spaceId } = options;

  const baseEndpoint =
    'DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31';
  const endpoint = spaceId
    ? (baseEndpoint.replace('/api/', `/s/${spaceId}/api/`) as typeof baseEndpoint)
    : baseEndpoint;

  const response = await apiClient.fetch(endpoint, {
    params: { path: { streamName: stream, attachmentType: type, attachmentId: id } },
  });

  expect(response.status).to.be(expectedStatusCode);
  return response.body;
}

export async function getAttachments(options: {
  apiClient: StreamsSupertestRepositoryClient;
  stream: string;
  filters?: {
    types?: AttachmentType[];
    query?: string;
    tags?: string[];
  };
  expectedStatusCode?: number;
  spaceId?: string;
}) {
  const { apiClient, stream, filters, expectedStatusCode = 200, spaceId } = options;

  const baseEndpoint = 'GET /api/streams/{streamName}/attachments 2023-10-31';
  const endpoint = spaceId
    ? (baseEndpoint.replace('/api/', `/s/${spaceId}/api/`) as typeof baseEndpoint)
    : baseEndpoint;

  const queryParams: Record<string, unknown> = {};
  if (filters?.types) queryParams.attachmentTypes = filters.types;
  if (filters?.query) queryParams.query = filters.query;
  if (filters?.tags) queryParams.tags = filters.tags;

  const response = await apiClient.fetch(endpoint, {
    params: {
      path: { streamName: stream },
      query: queryParams,
    },
  });

  expect(response.status).to.be(expectedStatusCode);
  return response.body;
}

export async function bulkAttachments(options: {
  apiClient: StreamsSupertestRepositoryClient;
  stream: string;
  operations: Array<
    | { index: { type: AttachmentType; id: string } }
    | { delete: { type: AttachmentType; id: string } }
  >;
  expectedStatusCode?: number;
  spaceId?: string;
}) {
  const { apiClient, stream, operations, expectedStatusCode = 200, spaceId } = options;

  const baseEndpoint = 'POST /api/streams/{streamName}/attachments/_bulk 2023-10-31';
  const endpoint = spaceId
    ? (baseEndpoint.replace('/api/', `/s/${spaceId}/api/`) as typeof baseEndpoint)
    : baseEndpoint;

  const response = await apiClient.fetch(endpoint, {
    params: {
      path: { streamName: stream },
      body: { operations },
    },
  });

  expect(response.status).to.be(expectedStatusCode);
  return response.body;
}

export async function getAttachmentSuggestions(options: {
  apiClient: StreamsSupertestRepositoryClient;
  stream: string;
  filters?: {
    types?: AttachmentType[];
    query?: string;
    tags?: string[];
  };
  expectedStatusCode?: number;
  spaceId?: string;
}) {
  const { apiClient, stream, filters, expectedStatusCode = 200, spaceId } = options;

  const baseEndpoint = 'GET /internal/streams/{streamName}/attachments/_suggestions';
  const endpoint = spaceId
    ? (baseEndpoint.replace('/internal/', `/s/${spaceId}/internal/`) as typeof baseEndpoint)
    : baseEndpoint;

  const queryParams: Record<string, unknown> = {};
  if (filters?.query) queryParams.query = filters.query;
  if (filters?.types) queryParams.attachmentTypes = filters.types;
  if (filters?.tags) queryParams.tags = filters.tags;

  const response = await apiClient.fetch(endpoint, {
    params: {
      path: { streamName: stream },
      query: queryParams,
    },
  });
  expect(response.status).to.be(expectedStatusCode);

  return response.body;
}

export async function exportContent(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: ContentPackManifest & {
    include: ContentPackIncludedObjects;
  },
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('POST /api/streams/{name}/content/export 2023-10-31', {
      params: {
        path: { name },
        body,
      },
    })
    .responseType('blob')
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function importContent(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: {
    include: ContentPackIncludedObjects;
    content: Readable;
    filename: string;
  },
  expectStatusCode: number = 200
) {
  return await apiClient
    .sendFile('POST /api/streams/{name}/content/import 2023-10-31', {
      params: {
        path: { name },
        body: {
          include: JSON.stringify(body.include),
          content: body.content,
        },
      },
      file: { key: 'content', filename: body.filename },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}
