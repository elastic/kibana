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
  CoreRequestHandlerContext,
} from '@kbn/core/server';
import chalk from 'chalk';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ESSearchResponse } from '@kbn/es-types';
import { RequestStatus } from '@kbn/inspector-plugin/common';
import { getInspectResponse } from '@kbn/observability-plugin/server';
import { InspectResponse } from '@kbn/observability-plugin/typings/common';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { API_URLS } from '../../../common/constants';
import { UptimeServerSetup } from './adapters';
import { UMLicenseCheck } from './domains';
import { UptimeRequests } from './requests';
import { savedObjectsAdapter } from './saved_objects/saved_objects';

export interface UMDomainLibs {
  requests: UptimeRequests;
  license: UMLicenseCheck;
}

export type { UMServerLibs } from '../uptime_server';

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

export class UptimeEsClient {
  isDev: boolean;
  request?: KibanaRequest;
  baseESClient: ElasticsearchClient;
  heartbeatIndices: string;
  isInspectorEnabled: boolean | undefined;
  inspectableEsQueries: InspectResponse = [];
  uiSettings?: CoreRequestHandlerContext['uiSettings'];
  savedObjectsClient: SavedObjectsClientContract;

  constructor(
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    isDev: boolean = false,
    uiSettings?: CoreRequestHandlerContext['uiSettings'],
    request?: KibanaRequest
  ) {
    this.uiSettings = uiSettings;
    this.baseESClient = esClient;
    this.isInspectorEnabled = undefined;
    this.savedObjectsClient = savedObjectsClient;
    this.request = request;
    this.heartbeatIndices = '';
    this.isDev = isDev;
    this.inspectableEsQueries = [];
  }

  async initSettings() {
    const self = this;
    if (!self.heartbeatIndices) {
      const [isInspectorEnabled, dynamicSettings] = await Promise.all([
        getInspectEnabled(self.uiSettings),
        savedObjectsAdapter.getUptimeDynamicSettings(self.savedObjectsClient),
      ]);

      self.heartbeatIndices = dynamicSettings?.heartbeatIndices || '';
      self.isInspectorEnabled = isInspectorEnabled;
    }
  }

  async search<DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
    params: TParams,
    operationName?: string,
    index?: string
  ): Promise<{ body: ESSearchResponse<DocumentSource, TParams> }> {
    let res: any;
    let esError: any;

    await this.initSettings();

    const esParams = { index: index ?? this.heartbeatIndices, ...params };
    const startTime = process.hrtime();

    const startTimeNow = Date.now();

    let esRequestStatus: RequestStatus = RequestStatus.PENDING;

    try {
      res = await this.baseESClient.search(esParams, { meta: true });
      esRequestStatus = RequestStatus.OK;
    } catch (e) {
      esError = e;
      esRequestStatus = RequestStatus.ERROR;
    }
    if (this.request) {
      this.inspectableEsQueries.push(
        getInspectResponse({
          esError,
          esRequestParams: esParams,
          esRequestStatus,
          esResponse: res?.body,
          kibanaRequest: this.request,
          operationName: operationName ?? '',
          startTime: startTimeNow,
        })
      );
    }

    if (this.isInspectorEnabled && this.request) {
      debugESCall({
        startTime,
        request: this.request,
        esError,
        operationName: 'search',
        params: esParams,
      });
    }

    if (esError) {
      throw esError;
    }

    return res;
  }
  async count<TParams>(params: TParams): Promise<CountResponse> {
    let res: any;
    let esError: any;

    await this.initSettings();

    const esParams = { index: this.heartbeatIndices, ...params };
    const startTime = process.hrtime();

    try {
      res = await this.baseESClient.count(esParams, { meta: true });
    } catch (e) {
      esError = e;
    }

    if (this.isInspectorEnabled && this.request) {
      debugESCall({
        startTime,
        request: this.request,
        esError,
        operationName: 'count',
        params: esParams,
      });
    }

    if (esError) {
      throw esError;
    }

    return { result: res, indices: this.heartbeatIndices };
  }
  getSavedObjectsClient() {
    return this.savedObjectsClient;
  }

  getInspectData(path: string) {
    const isInspectorEnabled =
      (this.isInspectorEnabled || this.isDev) && path !== API_URLS.DYNAMIC_SETTINGS;

    if (isInspectorEnabled) {
      return { _inspect: this.inspectableEsQueries };
    }
    return {};
  }
}

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}

function getInspectEnabled(uiSettings?: CoreRequestHandlerContext['uiSettings']) {
  if (!uiSettings) {
    return false;
  }

  return uiSettings.client.get<boolean>(enableInspectEsQueries);
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

export const isTestUser = (server: UptimeServerSetup) => {
  return server.config.service?.username === 'localKibanaIntegrationTestsUser';
};
