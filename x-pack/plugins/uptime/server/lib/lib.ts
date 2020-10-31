/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ElasticsearchClient } from 'kibana/server';
import { UMBackendFrameworkAdapter } from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}

import { ESSearchResponse } from '../../../apm/typings/elasticsearch';

export type UptimeESClient = ReturnType<typeof createUptimeESClient>;

export function createUptimeESClient({ esClient }: { esClient: ElasticsearchClient }) {
  return {
    baseESClient: esClient,
    async search<TParams>(params: TParams): Promise<{ body: ESSearchResponse<unknown, TParams> }> {
      let res: any;
      try {
        res = await esClient.search(params);
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
      let res: any;
      try {
        res = await esClient.search(params);
      } catch (e) {
        throw e;
      }
      return res;
    },
  };
}
