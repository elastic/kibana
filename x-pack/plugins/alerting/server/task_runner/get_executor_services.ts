/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IUiSettingsClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { DataViewsContract } from '@kbn/data-plugin/common';
import { TaskRunnerContext } from './types';
import { createWrappedScopedClusterClientFactory } from '../lib';
import {
  WrappedSearchSourceClient,
  wrapSearchSourceClient,
} from '../lib/wrap_search_source_client';
import { WrappedScopedClusterClient } from '../lib/wrap_scoped_cluster_client';
import { PublicRuleMonitoringService, PublicRuleResultService } from '../types';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';

interface GetExecutorServicesOpts {
  context: TaskRunnerContext;
  fakeRequest: KibanaRequest;
  abortController: AbortController;
  logger: Logger;
  ruleMonitoringService: RuleMonitoringService;
  ruleResultService: RuleResultService;
  ruleData: { name: string; alertTypeId: string; id: string; spaceId: string };
}

export interface ExecutorServices {
  dataViews: DataViewsContract;
  wrappedSearchSourceClient: WrappedSearchSourceClient;
  wrappedScopedClusterClient: WrappedScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  publicRuleMonitoringService: PublicRuleMonitoringService;
  publicRuleResultService: PublicRuleResultService;
}

export const getExecutorServices = async (
  opts: GetExecutorServicesOpts
): Promise<ExecutorServices> => {
  const { context, abortController, fakeRequest, logger, ruleData } = opts;
  const wrappedClientOptions = { rule: ruleData, logger, abortController };
  const scopedClusterClient = context.elasticsearch.client.asScoped(fakeRequest);
  const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
    ...wrappedClientOptions,
    scopedClusterClient,
  });
  const searchSourceClient = await context.data.search.searchSource.asScoped(fakeRequest);
  const wrappedSearchSourceClient = wrapSearchSourceClient({
    ...wrappedClientOptions,
    searchSourceClient,
  });
  const savedObjectsClient = context.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: ['alert', 'action'],
  });
  const dataViews = await context.dataViews.dataViewsServiceFactory(
    savedObjectsClient,
    scopedClusterClient.asInternalUser
  );
  const uiSettingsClient = context.uiSettings.asScopedToClient(savedObjectsClient);

  return {
    wrappedScopedClusterClient,
    wrappedSearchSourceClient,
    savedObjectsClient,
    dataViews,
    uiSettingsClient,
    publicRuleMonitoringService: opts.ruleMonitoringService.getLastRunMetricsSetters(),
    publicRuleResultService: opts.ruleResultService.getLastRunSetters(),
  };
};
