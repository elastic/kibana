/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { decodeCloudId } from '@kbn/fleet-plugin/common';

const DEFAULT_ES_HOSTS = ['http://localhost:9200'];

export function getESHosts({
  cloudSetup,
  esClient,
}: {
  cloudSetup: CloudSetup;
  esClient: Client;
}): string[] {
  if (cloudSetup.cloudId) {
    const cloudUrl = decodeCloudId(cloudSetup.cloudId)?.elasticsearchUrl;
    if (cloudUrl) {
      return [cloudUrl];
    }
  }

  const aliveConnections = esClient.connectionPool.connections.filter(
    ({ status }) => status === 'alive'
  );
  if (aliveConnections.length) {
    return aliveConnections.map(({ url }) => {
      const { protocol, host } = new URL(url);
      return `${protocol}//${host}`;
    });
  }

  return DEFAULT_ES_HOSTS;
}
