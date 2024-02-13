/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import { IUiSettingsClient } from '@kbn/core/server';
import type {
  ChatRegistrationFunction,
  RegisterFunction,
} from '@kbn/observability-ai-assistant-plugin/server/service/types';
import { DataViewsServerPluginStart, DataViewsService } from '@kbn/data-views-plugin/server';
import type { ObservabilityConfig } from '..';
import type { ObservabilityRouteHandlerResources } from '../routes/types';
import {
  KibanaSavedObjectsSLORepository,
  DefaultSummarySearchClient,
  DefaultSummaryClient,
  GetSLO,
  FindSLO,
} from '../services/slo';
import { registerGetSLOListFunction } from './get_slo_list';
import { registerGetSLOChangeDetectionFunction } from './get_slo_change_point';

export interface FunctionRegistrationParameters {
  sloClient: {
    find: FindSLO;
    get: GetSLO;
  };
  registerFunction: RegisterFunction;
  resources: ObservabilityRouteHandlerResources;
  dataViewsClient: DataViewsService;
  uiSettingsClient: IUiSettingsClient;
}
export function registerAssistantFunctions({
  coreSetup,
  config,
  logger,
  getRulesClientWithRequest,
  getRacClientWithRequest,
  ruleDataService,
  dataViews,
  uiSettingsClient,
}: {
  coreSetup: CoreSetup;
  config: ObservabilityConfig;
  logger: Logger;
  getRulesClientWithRequest: RegisterRoutesDependencies['getRulesClientWithRequest'];
  getRacClientWithRequest: RegisterRoutesDependencies['getRacClientWithRequest'];
  ruleDataService: RegisterRoutesDependencies['ruleDataService'];
  dataViews: DataViewsServerPluginStart;
  uiSettingsClient: IUiSettingsClient;
}): ChatRegistrationFunction {
  return async ({ resources, registerContext, registerFunction }) => {
    const observabilityRouteHandlerResources: ObservabilityRouteHandlerResources = {
      context: resources.context,
      request: resources.request,
      dependencies: {
        pluginsSetup: {
          core: coreSetup,
        },
        ruleDataService,
        getRulesClientWithRequest,
        getRacClientWithRequest,
      },
      config,
      logger,
    };

    const soClient = (await resources.context.core).savedObjects.client;
    const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;
    const dataViewsClient = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    // TODO: handle space id
    const summaryClient = new DefaultSummaryClient(esClient);
    const summarySearchClient = new DefaultSummarySearchClient(esClient, logger, 'default');
    const find = new FindSLO(repository, summarySearchClient);
    const get = new GetSLO(repository, summaryClient);

    const parameters: FunctionRegistrationParameters = {
      resources: observabilityRouteHandlerResources,
      sloClient: {
        find,
        get,
      },
      registerFunction,
      dataViewsClient,
      uiSettingsClient,
    };

    registerGetSLOListFunction(parameters);
    registerGetSLOChangeDetectionFunction(parameters);

    registerContext({
      name: 'slo',
      description: `
      When analyzing SLO data, prefer the SLO specific functions over the generic Lens,
      Elasticsearch or Kibana ones, unless those are explicitly requested by the user.

      Dates should be formatted according to the user's Kibana settings.

      When displaying SLO Burn Rate alerts, always include the time the alert started (kibana.alert.start),
      and the duration (kibana.alert.duration.us) of the alert in minutes.

      When displaying SO Burn Rate alerts, replace the "Alert Evaluation Threshold" label with "Burn Rate Threshold". 
      Also, replace the "Alert Evaluation Value" label with "Burn Rate Value". * Ex: Burn Rate Threshold: 14.4
      * Burn Rate Value: 70

      When analyzing changes in the source data for the SLO, be sure to pass the long and short window from any associated 
      burn rate alerts, if available. Ex: * longWindow: 1h * shortWindow: 5m

      When presenting the user with change detection information, always omit the "change_point" field. Only include the approximate change
      time and the p-value. Ex: "The latency field has shown a step change at approximately 2024-01-10T15:00:00.000Z. The p-value is very small (3.18e-20), which suggests that this change is statistically significant."
      
      When searching for an SLO based off a burn rate alert, remove "Burn rate rule" from the alert name before passing the name to a function.
      Ex: "Cart service Burn Rate rule" should become "Cart service".

      There are six different types of SLO indicators. They are:
        - 'sli.apm.transactionDuration': APM Latency
        - 'sli.apm.transactionErrorRate': APM Availability
        - 'sli.kql.custom': Custom KQL
        - 'sli.metric.custom': Custom Metric
        - 'sli.metric.timeslice': Timeslice Metric
        - 'sli.histogram.custom': Histogram Metric
      `,
    });
  };
}

