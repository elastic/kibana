/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  AlertDetailsContextualInsightsHandlerQuery,
  AlertDetailsContextualInsightsRequestContext,
} from '@kbn/observability-plugin/server/services';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { getApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getApmServiceSummary } from '../get_apm_service_summary';
import { getAssistantDownstreamDependencies } from '../get_apm_downstream_dependencies';
import { getLogCategories } from '../get_log_categories';
import { getAnomalies } from '../get_apm_service_summary/get_anomalies';
import { getServiceNameFromSignals } from './get_service_name_from_signals';
import { getContainerIdFromSignals } from './get_container_id_from_signals';
import { getExitSpanChangePoints, getServiceChangePoints } from '../get_changepoints';
import { APMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';

export const getAlertDetailsContextHandler = (
  resourcePlugins: APMRouteHandlerResources['plugins'],
  logger: Logger
) => {
  return async (
    requestContext: AlertDetailsContextualInsightsRequestContext,
    query: AlertDetailsContextualInsightsHandlerQuery
  ) => {
    const resources = {
      getApmIndices: async () => {
        const coreContext = await requestContext.core;
        return resourcePlugins.apmDataAccess.setup.getApmIndices(coreContext.savedObjects.client);
      },
      request: requestContext.request,
      params: { query: { _inspect: false } },
      plugins: resourcePlugins,
      context: {
        core: requestContext.core,
        licensing: requestContext.licensing,
        alerting: resourcePlugins.alerting!.start().then((startContract) => {
          return {
            getRulesClient() {
              return startContract.getRulesClientWithRequest(requestContext.request);
            },
          };
        }),
        rac: resourcePlugins.ruleRegistry.start().then((startContract) => {
          return {
            getAlertsClient() {
              return startContract.getRacClientWithRequest(requestContext.request);
            },
          };
        }),
      },
    };

    const [apmEventClient, annotationsClient, apmAlertsClient, coreContext, mlClient] =
      await Promise.all([
        getApmEventClient(resources),
        resourcePlugins.observability.setup.getScopedAnnotationsClient(
          resources.context,
          requestContext.request
        ),
        getApmAlertsClient(resources),
        requestContext.core,
        getMlClient(resources),
        getRandomSampler({
          security: resourcePlugins.security,
          probability: 1,
          request: requestContext.request,
        }),
      ]);
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    const alertStartedAt = query.alert_started_at;
    const serviceEnvironment = query['service.environment'];
    const hostName = query['host.name'];
    const kubernetesPodName = query['kubernetes.pod.name'];
    const [serviceName, containerId] = await Promise.all([
      getServiceNameFromSignals({
        query,
        esClient,
        coreContext,
        apmEventClient,
      }),
      getContainerIdFromSignals({
        query,
        esClient,
        coreContext,
        apmEventClient,
      }),
    ]);

    async function handleError<T>(cb: () => Promise<T>): Promise<T | undefined> {
      try {
        return await cb();
      } catch (error) {
        logger.error('Error while fetching observability alert details context');
        logger.error(error);
        return;
      }
    }

    const serviceSummaryPromise = serviceName
      ? handleError(() =>
          getApmServiceSummary({
            apmEventClient,
            annotationsClient,
            esClient,
            apmAlertsClient,
            mlClient,
            logger,
            arguments: {
              'service.name': serviceName,
              'service.environment': serviceEnvironment,
              start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
              end: alertStartedAt,
            },
          })
        )
      : undefined;

    const downstreamDependenciesPromise = serviceName
      ? handleError(() =>
          getAssistantDownstreamDependencies({
            apmEventClient,
            arguments: {
              'service.name': serviceName,
              'service.environment': serviceEnvironment,
              start: moment(alertStartedAt).subtract(15, 'minute').toISOString(),
              end: alertStartedAt,
            },
          })
        )
      : undefined;

    const logCategoriesPromise = handleError(() =>
      getLogCategories({
        esClient,
        coreContext,
        arguments: {
          start: moment(alertStartedAt).subtract(15, 'minute').toISOString(),
          end: alertStartedAt,
          'service.name': serviceName,
          'host.name': hostName,
          'container.id': containerId,
          'kubernetes.pod.name': kubernetesPodName,
        },
      })
    );

    const serviceChangePointsPromise = handleError(() =>
      getServiceChangePoints({
        apmEventClient,
        start: moment(alertStartedAt).subtract(6, 'hours').toISOString(),
        end: alertStartedAt,
        serviceName,
        serviceEnvironment,
        transactionType: query['transaction.type'],
        transactionName: query['transaction.name'],
      })
    );

    const exitSpanChangePointsPromise = handleError(() =>
      getExitSpanChangePoints({
        apmEventClient,
        start: moment(alertStartedAt).subtract(6, 'hours').toISOString(),
        end: alertStartedAt,
        serviceName,
        serviceEnvironment,
      })
    );

    const anomaliesPromise = handleError(() =>
      getAnomalies({
        start: moment(alertStartedAt).subtract(1, 'hour').valueOf(),
        end: moment(alertStartedAt).valueOf(),
        environment: serviceEnvironment,
        mlClient,
        logger,
      })
    );

    const [
      serviceSummary,
      downstreamDependencies,
      logCategories,
      serviceChangePoints,
      exitSpanChangePoints,
      anomalies,
    ] = await Promise.all([
      serviceSummaryPromise,
      downstreamDependenciesPromise,
      logCategoriesPromise,
      serviceChangePointsPromise,
      exitSpanChangePointsPromise,
      anomaliesPromise,
    ]);

    return [
      {
        key: 'serviceSummary',
        description: 'Metadata for the service where the alert occurred',
        data: serviceSummary,
      },
      {
        key: 'downstreamDependencies',
        description: `Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}"`,
        data: downstreamDependencies,
      },
      {
        key: 'serviceChangePoints',
        description: `Significant change points for "${serviceName}". Use this to spot dips and spikes in throughput, latency and failure rate`,
        data: serviceChangePoints,
      },
      {
        key: 'exitSpanChangePoints',
        description: `Significant change points for the dependencies of "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate for downstream dependencies`,
        data: exitSpanChangePoints,
      },
      {
        key: 'logCategories',
        description: `Log events occurring around the time of the alert`,
        data: logCategories,
      },
      {
        key: 'anomalies',
        description: `Anomalies for services running in the environment "${serviceEnvironment}"`,
        data: anomalies,
      },
    ].filter(({ data }) => !isEmpty(data));
  };
};
