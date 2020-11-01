/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chalk from 'chalk';
import { ElasticsearchClient, KibanaRequest } from 'kibana/server';
import { UMBackendFrameworkAdapter } from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';
import { ESSearchResponse } from '../../../apm/typings/elasticsearch';
import { DynamicSettings } from '../../common/runtime_types';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}

interface CountResponse {
  body: {
    count: number;
    _shards: {
      total: number;
      successful: number;
      skipped: number;
      failed: number;
    };
  };
}

export type UptimeESClient = ReturnType<typeof createUptimeESClient>;

export function createUptimeESClient({
  esClient,
  request,
  dynamicSettings,
}: {
  esClient: ElasticsearchClient;
  request?: KibanaRequest;
  dynamicSettings?: DynamicSettings;
}) {
  const { _debug = false } = (request?.query as { _debug: boolean }) ?? {};

  return {
    baseESClient: esClient,
    async search<TParams>(params: TParams): Promise<{ body: ESSearchResponse<unknown, TParams> }> {
      let res: any;
      let esError: any;

      const esParams = { index: dynamicSettings!.heartbeatIndices, ...params };

      try {
        res = await esClient.search(esParams);
      } catch (e) {
        esError = e;
      }
      if (_debug && request) {
        debugESCall({ request, esError, operationName: 'search', params: esParams });
      }

      if (esError) {
        throw esError;
      }

      return res;
    },
    async count<TParams>(params: TParams): Promise<CountResponse> {
      let res: any;
      let esError: any;

      const esParams = { index: dynamicSettings!.heartbeatIndices, ...params };

      try {
        res = await esClient.search(esParams);
      } catch (e) {
        esError = e;
      }

      if (_debug && request) {
        debugESCall({ request, esError, operationName: 'count', params: esParams });
      }

      if (esError) {
        throw esError;
      }

      return res;
    },
  };
}

/* eslint-disable no-console */

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj, null, 2);
}

export function debugESCall({
  operationName,
  params,
  request,
  esError,
}: {
  operationName: string;
  params: Record<string, any>;
  request: KibanaRequest;
  esError: any;
}) {
  const startTime = process.hrtime();

  const highlightColor = esError ? 'bgRed' : 'inverse';
  const diff = process.hrtime(startTime);
  const duration = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
  const routeInfo = `${request.route.method.toUpperCase()} ${request.route.path}`;

  console.log(chalk.bold[highlightColor](`=== Debug: ${routeInfo} (${duration}) ===`));

  if (operationName === 'search') {
    console.log(`GET ${params.index}/_${operationName}`);
    console.log(formatObj(params.body));
  } else {
    console.log(chalk.bold('ES operation:'), operationName);

    console.log(chalk.bold('ES query:'));
    console.log(formatObj(params));
  }
  console.log(`\n`);
}
