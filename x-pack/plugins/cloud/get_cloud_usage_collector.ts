/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { KIBANA_CLOUD_STATS_TYPE } from './constants';

export interface UsageStats {
  isCloudEnabled: boolean;
  esUUID: string | undefined;
}

export interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
    };
  };
}

export function parseEsUUID(cloudID?: string): string | undefined {
  // cloudID hash pattern `HOST$ES-ID$KB-ID`
  // https://github.com/elastic/cloud/blob/master/scala-services/zookeeper/src/main/scala/no/found/zookeeper/models/clusters/id/CloudIdGenerator.scala#L111
  if (!cloudID) {
    return;
  }
  const [hash] = cloudID.split(':').reverse();
  const decodedIds = Buffer.from(hash, 'base64').toString();
  const hashingPattern = /^(?<host>.*)\$(?<esID>.*)\$(?<kbID>.*)$/;
  const match = decodedIds.match(hashingPattern);
  if (match && match.groups) {
    return match.groups.esID;
  }
}

export function createCollectorFetch(server: any) {
  return async function fetchUsageStats(): Promise<UsageStats> {
    const { id } = server.config().get(`xpack.cloud`);

    return {
      isCloudEnabled: !!id,
      esUUID: parseEsUUID(id),
    };
  };
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getCloudUsageCollector(server: KibanaHapiServer) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_CLOUD_STATS_TYPE,
    fetch: createCollectorFetch(server),
  });
}
