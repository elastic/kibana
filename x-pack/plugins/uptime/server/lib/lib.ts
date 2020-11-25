/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { UMBackendFrameworkAdapter } from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';
import { savedObjectsAdapter } from './saved_objects';
import { ESSearchResponse } from '../../../../typings/elasticsearch';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}

export type UptimeESClient = ReturnType<typeof createUptimeESClient>;

export function createUptimeESClient({
  esClient,
  savedObjectsClient,
}: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  return {
    baseESClient: esClient,
    async search<TParams>(params: TParams): Promise<{ body: ESSearchResponse<unknown, TParams> }> {
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient!
      );

      let res: any;
      try {
        res = await esClient.search({ index: dynamicSettings!.heartbeatIndices, ...params });
      } catch (e) {
        throw e;
      }
      return res;
    },
    async count<TParams>(
      params: TParams
    ): Promise<{
      body: {
        count: number;
        _shards: {
          total: number;
          successful: number;
          skipped: number;
          failed: number;
        };
      };
    }> {
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient!
      );

      let res: any;
      try {
        res = await esClient.count({ index: dynamicSettings!.heartbeatIndices, ...params });
      } catch (e) {
        throw e;
      }
      return res;
    },
    getSavedObjectsClient() {
      return savedObjectsClient;
    },
  };
}
