/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
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
// import { registerGetApmCorrelationsFunction } from './get_apm_correlations';
// import { registerGetApmDownstreamDependenciesFunction } from './get_apm_downstream_dependencies';
// import { registerGetApmErrorDocumentFunction } from './get_apm_error_document';
import { registerGetSLOListFunction } from './get_slo_list';
import { registerGetSLOChangeDetectionFunction } from './get_slo_change_point';
// import { registerGetApmTimeseriesFunction } from './get_apm_timeseries';

export interface FunctionRegistrationParameters {
  sloClient: {
    find: FindSLO;
    get: GetSLO;
  };
  registerFunction: RegisterFunction;
  resources: ObservabilityRouteHandlerResources;
  dataViewsClient: DataViewsService;
}
export function registerAssistantFunctions({
  coreSetup,
  config,
  logger,
  getRulesClientWithRequest,
  getRacClientWithRequest,
  ruleDataService,
  dataViews,
}: {
  coreSetup: CoreSetup;
  config: ObservabilityConfig;
  logger: Logger;
  getRulesClientWithRequest: RegisterRoutesDependencies['getRulesClientWithRequest'];
  getRacClientWithRequest: RegisterRoutesDependencies['getRacClientWithRequest'];
  ruleDataService: RegisterRoutesDependencies['ruleDataService'];
  dataViews: DataViewsServerPluginStart;
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

    // const apmEventClient = await getApmEventClient(observabilityRouteHandlerResources);

    // const hasData = await hasHistoricalAgentData(apmEventClient);

    // if (!hasData) {
    //   return;
    // }

    const soClient = (await resources.context.core).savedObjects.client;
    const esClient = (await resources.context.core).elasticsearch.client.asCurrentUser;
    const dataViewsClient = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient);
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
    };

    registerGetSLOListFunction(parameters);
    registerGetSLOChangeDetectionFunction(parameters);
    // registerGetApmErrorDocumentFunction(parameters);
    // registerGetApmDownstreamDependenciesFunction(parameters);
    // registerGetApmCorrelationsFunction(parameters);
    // registerGetApmTimeseriesFunction(parameters);

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

// When requesting metrics for a service, make sure you also know what environment
// it is running in. Metrics aggregated over multiple environments are useless.

// The four data types are transactions, exit spans, error events, and application
// metrics.

// Transactions have three metrics: throughput, failure rate, and latency. The
// fields are:

// - transaction.type: often request or page-load (the main transaction types),
// but can also be worker, or route-change.
// - transaction.name: The name of the transaction group, often something like
// 'GET /api/product/:productId'
// - transaction.result: The result. Used to capture HTTP response codes
// (2xx,3xx,4xx,5xx) for request transactions.
// - event.outcome: whether the transaction was succesful or not. success,
// failure, or unknown.

// Exit spans have three metrics: throughput, failure rate and latency. The fields
// are:
// - span.type: db, external
// - span.subtype: the type of database (redis, postgres) or protocol (http, grpc)
// - span.destination.service.resource: the address of the destination of the call
// - event.outcome: whether the transaction was succesful or not. success,
// failure, or unknown.

// Error events have one metric, error event rate. The fields are:
// - error.grouping_name: a human readable keyword that identifies the error group

// For transaction metrics we also collect anomalies. These are scored 0 (low) to
// 100 (critical).

// For root cause analysis, locate a change point in the relevant metrics for a
// service or downstream dependency. You can locate a change point by using a
// sliding window, e.g. start with a small time range, like 30m, and make it
// bigger until you identify a change point. It's very important to identify a
// change point. If you don't have a change point, ask the user for next steps.
// You can also use an anomaly or a deployment as a change point. Then, compare
// data before the change with data after the change. You can either use the
// groupBy parameter in get_apm_chart to get the most occuring values in a certain
// data set, or you can use correlations to see for which field and value the
// frequency has changed when comparing the foreground set to the background set.
// This is useful when comparing data from before the change point with after the
// change point. For instance, you might see a specific error pop up more often
// after the change point.

// When comparing anomalies and changes in timeseries, first, zoom in to a smaller
// time window, at least 30 minutes before and 30 minutes after the change
// occured. E.g., if the anomaly occured at 2023-07-05T08:15:00.000Z, request a
// time window that starts at 2023-07-05T07:45:00.000Z and ends at
// 2023-07-05T08:45:00.000Z. When comparing changes in different timeseries and
// anomalies to determine a correlation, make sure to compare the timestamps. If
// in doubt, rate the likelihood of them being related, given the time difference,
// between 1 and 10. If below 5, assume it's not related. Mention this likelihood
// (and the time difference) to the user.

// Your goal is to help the user determine the root cause of an issue quickly and
// transparently. If you see a change or
// anomaly in a metric for a service, try to find similar changes in the metrics
// for the traffic to its downstream dependencies, by comparing transaction
// metrics to span metrics. To inspect the traffic from one service to a
// downstream dependency, first get the downstream dependencies for a service,
// then get the span metrics from that service (\`service.name\`) to its
// downstream dependency (\`span.destination.service.resource\`). For instance,
// for an anomaly in throughput, first inspect \`transaction_throughput\` for
// \`service.name\`. Then, inspect \`exit_span_throughput\` for its downstream
// dependencies, by grouping by \`span.destination.service.resource\`. Repeat this
// process over the next service its downstream dependencies until you identify a
// root cause. If you can not find any similar changes, use correlations or
// grouping to find attributes that could be causes for the change.
