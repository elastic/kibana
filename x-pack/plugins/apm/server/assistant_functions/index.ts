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
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { APMConfig } from '..';
import type { ApmFeatureFlags } from '../../common/apm_feature_flags';
import { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import { getApmEventClient } from '../lib/helpers/get_apm_event_client';
import type { APMRouteHandlerResources } from '../routes/apm_routes/register_apm_server_routes';
import { hasHistoricalAgentData } from '../routes/historical_data/has_historical_agent_data';
import { registerGetApmCorrelationsFunction } from './get_apm_correlations';
import { registerGetApmDownstreamDependenciesFunction } from './get_apm_downstream_dependencies';
import { registerGetApmErrorDocumentFunction } from './get_apm_error_document';
import { registerGetApmServicesListFunction } from './get_apm_services_list';
import { registerGetApmServiceSummaryFunction } from './get_apm_service_summary';
import { registerGetApmTimeseriesFunction } from './get_apm_timeseries';

export interface FunctionRegistrationParameters {
  apmEventClient: APMEventClient;
  registerFunction: RegisterFunction;
  resources: APMRouteHandlerResources;
}

export function registerAssistantFunctions({
  coreSetup,
  config,
  featureFlags,
  logger,
  kibanaVersion,
  ruleDataClient,
  plugins,
}: {
  coreSetup: CoreSetup;
  config: APMConfig;
  featureFlags: ApmFeatureFlags;
  logger: Logger;
  kibanaVersion: string;
  ruleDataClient: IRuleDataClient;
  plugins: APMRouteHandlerResources['plugins'];
}): ChatRegistrationFunction {
  return async ({ resources, registerContext, registerFunction }) => {
    const apmRouteHandlerResources: APMRouteHandlerResources = {
      context: resources.context,
      request: resources.request,
      core: {
        setup: coreSetup,
        start: () =>
          coreSetup.getStartServices().then(([coreStart]) => coreStart),
      },
      params: {
        query: {
          _inspect: false,
        },
      },
      config,
      featureFlags,
      logger,
      kibanaVersion,
      ruleDataClient,
      plugins,
      getApmIndices: async () => {
        const coreContext = await resources.context.core;
        const apmIndices = await plugins.apmDataAccess.setup.getApmIndices(
          coreContext.savedObjects.client
        );
        return apmIndices;
      },
    };

    const apmEventClient = await getApmEventClient(apmRouteHandlerResources);

    const hasData = await hasHistoricalAgentData(apmEventClient);

    if (!hasData) {
      return;
    }

    const parameters: FunctionRegistrationParameters = {
      resources: apmRouteHandlerResources,
      apmEventClient,
      registerFunction,
    };

    registerGetApmServicesListFunction(parameters);
    registerGetApmServiceSummaryFunction(parameters);
    registerGetApmErrorDocumentFunction(parameters);
    registerGetApmDownstreamDependenciesFunction(parameters);
    registerGetApmCorrelationsFunction(parameters);
    registerGetApmTimeseriesFunction(parameters);

    registerContext({
      name: 'apm',
      description: `
      When analyzing APM data, prefer the APM specific functions over the generic Lens,
      Elasticsearch or Kibana ones, unless those are explicitly requested by the user.
  
      When requesting metrics for a service, make sure you also know what environment
      it is running in. Metrics aggregated over multiple environments are useless.
  
      There are four important data types in Elastic APM. Each of them have the
      following fields:
      - service.name: the name of the service
      - service.node.name: the id of the service instance (often the hostname)
      - service.environment: the environment (often production, development)
      - agent.name: the name of the agent (go, java, etc)
  
      The four data types are transactions, exit spans, error events, and application
      metrics.
  
      Transactions have three metrics: throughput, failure rate, and latency. The
      fields are:
  
      - transaction.type: often request or page-load (the main transaction types),
      but can also be worker, or route-change.
      - transaction.name: The name of the transaction group, often something like
      'GET /api/product/:productId'
      - transaction.result: The result. Used to capture HTTP response codes
      (2xx,3xx,4xx,5xx) for request transactions.
      - event.outcome: whether the transaction was succesful or not. success,
      failure, or unknown.
  
      Exit spans have three metrics: throughput, failure rate and latency. The fields
      are:
      - span.type: db, external
      - span.subtype: the type of database (redis, postgres) or protocol (http, grpc)
      - span.destination.service.resource: the address of the destination of the call
      - event.outcome: whether the transaction was succesful or not. success,
      failure, or unknown.
  
      Error events have one metric, error event rate. The fields are:
      - error.grouping_name: a human readable keyword that identifies the error group
  
      For transaction metrics we also collect anomalies. These are scored 0 (low) to
      100 (critical).
  
      For root cause analysis, locate a change point in the relevant metrics for a
      service or downstream dependency. You can locate a change point by using a
      sliding window, e.g. start with a small time range, like 30m, and make it
      bigger until you identify a change point. It's very important to identify a
      change point. If you don't have a change point, ask the user for next steps.
      You can also use an anomaly or a deployment as a change point. Then, compare
      data before the change with data after the change. You can either use the
      groupBy parameter in get_apm_chart to get the most occuring values in a certain
      data set, or you can use correlations to see for which field and value the
      frequency has changed when comparing the foreground set to the background set.
      This is useful when comparing data from before the change point with after the
      change point. For instance, you might see a specific error pop up more often
      after the change point.
  
      When comparing anomalies and changes in timeseries, first, zoom in to a smaller
      time window, at least 30 minutes before and 30 minutes after the change
      occured. E.g., if the anomaly occured at 2023-07-05T08:15:00.000Z, request a
      time window that starts at 2023-07-05T07:45:00.000Z and ends at
      2023-07-05T08:45:00.000Z. When comparing changes in different timeseries and
      anomalies to determine a correlation, make sure to compare the timestamps. If
      in doubt, rate the likelihood of them being related, given the time difference,
      between 1 and 10. If below 5, assume it's not related. Mention this likelihood
      (and the time difference) to the user.
  
      Your goal is to help the user determine the root cause of an issue quickly and
      transparently. If you see a change or
      anomaly in a metric for a service, try to find similar changes in the metrics
      for the traffic to its downstream dependencies, by comparing transaction
      metrics to span metrics. To inspect the traffic from one service to a
      downstream dependency, first get the downstream dependencies for a service,
      then get the span metrics from that service (\`service.name\`) to its
      downstream dependency (\`span.destination.service.resource\`). For instance,
      for an anomaly in throughput, first inspect \`transaction_throughput\` for
      \`service.name\`. Then, inspect \`exit_span_throughput\` for its downstream
      dependencies, by grouping by \`span.destination.service.resource\`. Repeat this
      process over the next service its downstream dependencies until you identify a
      root cause. If you can not find any similar changes, use correlations or
      grouping to find attributes that could be causes for the change.`,
    });
  };
}
