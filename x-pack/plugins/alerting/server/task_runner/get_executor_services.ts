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
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { RULE_SAVED_OBJECT_TYPE } from '..';
import { getEsRequestTimeout } from '../lib';
import {
  createWrappedScopedClusterClientFactory,
  WrappedScopedClusterClient,
} from '../lib/wrap_scoped_cluster_client';
import {
  WrappedSearchSourceClient,
  wrapSearchSourceClient,
} from '../lib/wrap_search_source_client';
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';
import { PublicRuleMonitoringService, PublicRuleResultService } from '../types';
import { withAlertingSpan } from './lib';
import { TaskRunnerContext } from './types';

interface GetExecutorServicesOpts {
  context: TaskRunnerContext;
  fakeRequest: KibanaRequest;
  abortController: AbortController;
  logger: Logger;
  ruleMonitoringService: RuleMonitoringService;
  ruleResultService: RuleResultService;
  ruleData: { name: string; alertTypeId: string; id: string; spaceId: string };
  ruleTaskTimeout?: string;
}

export interface ExecutorServices {
  dataViews: DataViewsContract;
  ruleMonitoringService: PublicRuleMonitoringService;
  ruleResultService: PublicRuleResultService;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  wrappedScopedClusterClient: WrappedScopedClusterClient;
  wrappedSearchSourceClient: WrappedSearchSourceClient;
}

export const getExecutorServices = async (opts: GetExecutorServicesOpts) => {
  const { context, abortController, fakeRequest, logger, ruleData, ruleTaskTimeout } = opts;

  const wrappedClientOptions = {
    rule: ruleData,
    logger,
    abortController,
    // Set the ES request timeout to the rule task timeout
    requestTimeout: getEsRequestTimeout(logger, ruleTaskTimeout),
  };

  const scopedClusterClient = context.elasticsearch.client.asScoped(fakeRequest);
  const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
    ...wrappedClientOptions,
    scopedClusterClient,
  });

  const searchSourceClient = await withAlertingSpan('alerting:get-search-source-client', () =>
    context.data.search.searchSource.asScoped(fakeRequest)
  );
  const wrappedSearchSourceClient = wrapSearchSourceClient({
    ...wrappedClientOptions,
    searchSourceClient,
  });

  const savedObjectsClient = context.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, 'action'],
  });

  const dataViews = await await withAlertingSpan('alerting:get-data-views-factory', () =>
    context.dataViews.dataViewsServiceFactory(
      savedObjectsClient,
      scopedClusterClient.asInternalUser
    )
  );

  const uiSettingsClient = context.uiSettings.asScopedToClient(savedObjectsClient);

  return {
    dataViews,
    ruleMonitoringService: opts.ruleMonitoringService.getLastRunMetricsSetters(),
    ruleResultService: opts.ruleResultService.getLastRunSetters(),
    savedObjectsClient,
    uiSettingsClient,
    wrappedScopedClusterClient,
    wrappedSearchSourceClient,
  };
};
