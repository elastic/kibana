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
import { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import { RuleResultService } from '../monitoring/rule_result_service';
import { PublicRuleMonitoringService, PublicRuleResultService } from '../types';
import { withAlertingSpan } from './lib';
import { TaskRunnerContext } from './types';

interface RuleData {
  name: string;
  alertTypeId: string;
  id: string;
  spaceId: string;
}

interface GetExecutorServicesOpts {
  context: TaskRunnerContext;
  fakeRequest: KibanaRequest;
  abortController: AbortController;
  logger: Logger;
  ruleMonitoringService: RuleMonitoringService;
  ruleResultService: RuleResultService;
  ruleData: RuleData;
  ruleTaskTimeout?: string;
}

interface WrappedClientOptions {
  rule: RuleData;
  logger: Logger;
  abortController: AbortController;
  requestTimeout?: number;
}

export interface ExecutorServices {
  ruleMonitoringService: PublicRuleMonitoringService;
  ruleResultService: PublicRuleResultService;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  wrappedScopedClusterClient: WrappedScopedClusterClient;
  getDataViews: () => Promise<DataViewsContract>;
  getWrappedClientOptions: () => {
    fakeRequest: KibanaRequest;
    wrappedClientOptions: WrappedClientOptions;
  };
}

export const getExecutorServices = (opts: GetExecutorServicesOpts) => {
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

  const savedObjectsClient = context.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, 'action'],
  });

  const uiSettingsClient = context.uiSettings.asScopedToClient(savedObjectsClient);

  return {
    ruleMonitoringService: opts.ruleMonitoringService.getLastRunMetricsSetters(),
    ruleResultService: opts.ruleResultService.getLastRunSetters(),
    savedObjectsClient,
    uiSettingsClient,
    wrappedScopedClusterClient,
    getDataViews: async () => {
      const dataViews = await withAlertingSpan('alerting:get-data-views-factory', () =>
        context.dataViews.dataViewsServiceFactory(
          savedObjectsClient,
          scopedClusterClient.asInternalUser
        )
      );
      return dataViews;
    },
    getWrappedClientOptions: () => ({ wrappedClientOptions, fakeRequest }),
  };
};
