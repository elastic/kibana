/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { CoreStart } from '@kbn/core/server';

export function getFallbackUrls(coreStart: CoreStart) {
  const esClient = coreStart.elasticsearch.client.asInternalUser as Client;
  const [elasticsearchUrl] = getElasticsearchUrl(esClient);
  const kibanaUrl = getKibanaUrl(coreStart);
  return { elasticsearchUrl, kibanaUrl };
}

function getElasticsearchUrl(esClient: Client): string[] {
  const aliveConnections = esClient.connectionPool.connections.filter(
    ({ status }) => status === 'alive',
  );
  if (aliveConnections.length) {
    return aliveConnections.map(({ url }) => {
      const { protocol, host } = new URL(url);
      return `${protocol}//${host}`;
    });
  }

  return ['http://localhost:9200'];
}

function getKibanaUrl({ http }: CoreStart) {
  const basePath = http.basePath;
  const { protocol, hostname, port } = http.getServerInfo();
  return `${protocol}://${hostname}:${port}${basePath
    // Prepending on '' removes the serverBasePath
    .prepend('/')
    .slice(0, -1)}`;
}
