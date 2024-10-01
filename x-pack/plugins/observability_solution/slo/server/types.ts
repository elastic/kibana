/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomRequestHandlerContext,
  CoreRequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { ElasticsearchClient, IBasePath, Logger } from '@kbn/core/server';
import { BurnRatesClient, SLORepository } from './services';

export interface SloRouteContext {
  spaceId: string;
  repository: SLORepository;
  esClient: ElasticsearchClient;
  scopedClusterClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  basePath: IBasePath;
  rulesClient: RulesClientApi;
  burnRatesClient: BurnRatesClient;
  dataViewsService: DataViewsService;
}

/**
 * @internal
 */
export type SloRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  core: Promise<CoreRequestHandlerContext>;
  slo: Promise<SloRouteContext>;
}>;
