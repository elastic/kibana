/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  KibanaRequest,
  ISavedObjectsRepository,
} from 'kibana/server';
import chalk from 'chalk';
import { estypes } from '@elastic/elasticsearch';
import { UMBackendFrameworkAdapter } from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';
import { savedObjectsAdapter } from './saved_objects';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
}

export interface UMServerLibs extends UMDomainLibs {
  framework: UMBackendFrameworkAdapter;
}

export interface CountResponse {
  result: {
    body: {
      count: number;
      _shards: {
        total: number;
        successful: number;
        skipped: number;
        failed: number;
      };
    };
  };
  indices: string;
}

export type UptimeESClient = ReturnType<typeof createUptimeESClient>;

export function createUptimeESClient({
  esClient,
  request,
  savedObjectsClient,
}: {
  esClient: ElasticsearchClient;
  request?: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
}) {
  const { _inspect = false } = (request?.query as { _inspect: boolean }) ?? {};

  return {
    baseESClient: esClient,
    async search<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
      params: TParams
    ): Promise<{ body: ESSearchResponse<DocumentSource, TParams> }> {
      let res: any;
      let esError: any;
      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient!
      );

      const esParams = { index: dynamicSettings!.heartbeatIndices, ...params };
      const startTime = process.hrtime();

      try {
        res = await esClient.search(esParams);
      } catch (e) {
        esError = e;
      }
      if (_inspect && request) {
        debugESCall({ startTime, request, esError, operationName: 'search', params: esParams });
      }

      if (esError) {
        throw esError;
      }

      return res;
    },
    async count<TParams>(params: TParams): Promise<CountResponse> {
      let res: any;
      let esError: any;

      const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
        savedObjectsClient!
      );

      const esParams = { index: dynamicSettings!.heartbeatIndices, ...params };
      const startTime = process.hrtime();

      try {
        res = await esClient.count(esParams);
      } catch (e) {
        esError = e;
      }

      if (_inspect && request) {
        debugESCall({ startTime, request, esError, operationName: 'count', params: esParams });
      }

      if (esError) {
        throw esError;
      }

      return { result: res, indices: dynamicSettings.heartbeatIndices };
    },
    getSavedObjectsClient() {
      return savedObjectsClient;
    },
  };
}

/* eslint-disable no-console */

function formatObj(obj: Record<string, any>) {
  return JSON.stringify(obj);
}

export function debugESCall({
  operationName,
  params,
  request,
  esError,
  startTime,
}: {
  operationName: string;
  params: Record<string, any>;
  request: KibanaRequest;
  esError: any;
  startTime: [number, number];
}) {
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
