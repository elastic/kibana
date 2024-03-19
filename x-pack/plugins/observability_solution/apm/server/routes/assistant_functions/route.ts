/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { omit } from 'lodash';
import moment from 'moment';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

import {
  CorrelationValue,
  correlationValuesRouteRt,
  getApmCorrelationValues,
} from './get_apm_correlation_values';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import { ApmServicesListItem, getApmServiceList } from './get_apm_service_list';
import {
  getApmServiceSummary,
  serviceSummaryRouteRt,
  type ServiceSummary,
} from './get_apm_service_summary';
import {
  ApmTimeseriesType,
  getApmTimeseries,
  getApmTimeseriesRt,
  TimeseriesChangePoint,
  type ApmTimeseries,
} from './get_apm_timeseries';
import { getLogCategories, LogCategories } from './get_log_categories';

const getApmAlertDetailsContextRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_apm_alert_details_context',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },

  params: t.type({
    query: t.intersection([
      t.type({
        'service.name': t.string,
        alert_started_at: t.string,
      }),
      t.partial({
        'service.environment': t.string,
        'transaction.type': t.string,
        'transaction.name': t.string,

        // alert fields
        'host.name': t.string,
        'container.id': t.string,
      }),
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    serviceSummary: ServiceSummary;
    downstreamDependencies: APMDownstreamDependency[];
    serviceList: ApmServicesListItem[];
    logCategories: LogCategories;
    serviceChangePoints: Array<{
      title: string;
      changes: TimeseriesChangePoint[];
    }>;
    exitSpanChangePoints: Array<{
      title: string;
      changes: TimeseriesChangePoint[];
    }>;
  }> => {
    const { context, request, plugins, logger, params } = resources;
    const { query } = params;
    const apmEventClient = await getApmEventClient(resources);
    const alertStartedAt = query.alert_started_at;

    const [
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
      randomSampler,
    ] = await Promise.all([
      plugins.observability.setup.getScopedAnnotationsClient(context, request),
      context.core.then(
        (coreContext): ElasticsearchClient =>
          coreContext.elasticsearch.client.asCurrentUser
      ),
      getApmAlertsClient(resources),
      getMlClient(resources),
      getRandomSampler({
        security: resources.plugins.security,
        probability: 1,
        request: resources.request,
      }),
    ]);

    // const ONE_MINUTE = 1 * 60 * 1000;
    // const start = new Date(alert.start - FIFTEEN_MINUTES).toISOString();

    const serviceSummaryPromise = getApmServiceSummary({
      apmEventClient,
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
      logger,
      arguments: {
        'service.name': query['service.name'],
        'service.environment': query['service.environment'],
        start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
        end: alertStartedAt,
      },
    });

    const downstreamDependenciesPromise = getAssistantDownstreamDependencies({
      apmEventClient,
      arguments: {
        'service.name': query['service.name'],
        'service.environment': query['service.environment'],
        start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
        end: alertStartedAt,
      },
    });

    const serviceListPromise = getApmServiceList({
      apmEventClient,
      apmAlertsClient,
      randomSampler,
      mlClient,
      logger,
      arguments: {
        'service.environment': query['service.environment'],
        start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
        end: alertStartedAt,
      },
    });

    const logCategoriesPromise = getLogCategories({
      esClient,
      arguments: {
        start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
        end: alertStartedAt,

        'service.name': query['service.name'],
        'host.name': query['host.name'],
        'container.id': query['container.id'],
      },
    });

    const serviceTimeseriesPromise = getApmTimeseries({
      apmEventClient,
      arguments: {
        start: moment(alertStartedAt).subtract(12, 'hours').toISOString(),
        end: alertStartedAt,
        stats: [
          {
            title: 'Latency',
            'service.name': query['service.name'],
            'service.environment': query['service.environment'],
            timeseries: {
              name: ApmTimeseriesType.transactionLatency,
              function: LatencyAggregationType.p95,
              'transaction.type': query['transaction.type'],
              'transaction.name': query['transaction.name'],
            },
          },
          {
            title: 'Throughput',
            'service.name': query['service.name'],
            'service.environment': query['service.environment'],
            timeseries: {
              name: ApmTimeseriesType.transactionThroughput,
              'transaction.type': query['transaction.type'],
              'transaction.name': query['transaction.name'],
            },
          },
          {
            title: 'Failure rate',
            'service.name': query['service.name'],
            'service.environment': query['service.environment'],
            timeseries: {
              name: ApmTimeseriesType.transactionFailureRate,
              'transaction.type': query['transaction.type'],
              'transaction.name': query['transaction.name'],
            },
          },
        ],
      },
    });

    const exitSpanTimeseriesPromise = getApmTimeseries({
      apmEventClient,
      arguments: {
        start: moment(alertStartedAt).subtract(30, 'minute').toISOString(),
        end: alertStartedAt,
        stats: [
          {
            title: 'Exit span latency',
            'service.name': query['service.name'],
            'service.environment': query['service.environment'],
            timeseries: {
              name: ApmTimeseriesType.exitSpanLatency,
            },
          },
          {
            title: 'Exit span failure rate',
            'service.name': query['service.name'],
            'service.environment': query['service.environment'],
            timeseries: {
              name: ApmTimeseriesType.exitSpanFailureRate,
            },
          },
        ],
      },
    });

    const [
      serviceSummary,
      downstreamDependencies,
      serviceList,
      logCategories,
      serviceTimeseries,
      exitSpanTimeseries,
    ] = await Promise.all([
      serviceSummaryPromise,
      downstreamDependenciesPromise,
      serviceListPromise,
      logCategoriesPromise,
      serviceTimeseriesPromise,
      exitSpanTimeseriesPromise,
    ]);

    const serviceChangePoints = serviceTimeseries.map(
      (
        timeseries
      ): {
        title: string;
        grouping: string;
        changes: TimeseriesChangePoint[];
      } => {
        return {
          title: timeseries.stat.title,
          grouping: timeseries.id,
          changes: timeseries.changes,
        };
      }
    );

    const exitSpanChangePoints = exitSpanTimeseries.map(
      (
        timeseries
      ): {
        title: string;
        grouping: string;
        changes: TimeseriesChangePoint[];
      } => {
        return {
          title: timeseries.stat.title,
          grouping: timeseries.id,
          changes: timeseries.changes,
        };
      }
    );

    return {
      serviceSummary,
      downstreamDependencies,
      serviceList,
      logCategories,
      serviceChangePoints,
      exitSpanChangePoints,
    };
  },
});

const getApmTimeSeriesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_timeseries',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    body: getApmTimeseriesRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
  }> => {
    const body = resources.params.body;

    const apmEventClient = await getApmEventClient(resources);

    const timeseries = await getApmTimeseries({
      apmEventClient,
      arguments: body,
    });

    return {
      content: timeseries.map(
        (series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')
      ),
      data: timeseries,
    };
  },
});

const getApmServiceSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_service_summary',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    query: serviceSummaryRouteRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: ServiceSummary;
  }> => {
    const args = resources.params.query;

    const { context, request, plugins, logger } = resources;

    const [
      apmEventClient,
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
    ] = await Promise.all([
      getApmEventClient(resources),
      plugins.observability.setup.getScopedAnnotationsClient(context, request),
      context.core.then(
        (coreContext): ElasticsearchClient =>
          coreContext.elasticsearch.client.asCurrentUser
      ),
      getApmAlertsClient(resources),
      getMlClient(resources),
    ]);

    return {
      content: await getApmServiceSummary({
        apmEventClient,
        annotationsClient,
        esClient,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: args,
      }),
    };
  },
});

const getDownstreamDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ content: APMDownstreamDependency[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { query } = params;

    return {
      content: await getAssistantDownstreamDependencies({
        arguments: query,
        apmEventClient,
      }),
    };
  },
});

const getApmCorrelationValuesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_correlation_values',
  params: t.type({
    body: correlationValuesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ content: CorrelationValue[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { body } = params;

    return {
      content: await getApmCorrelationValues({
        arguments: body,
        apmEventClient,
      }),
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getApmAlertDetailsContextRoute,
  ...getApmServiceSummaryRoute,
  ...getApmCorrelationValuesRoute,
  ...getDownstreamDependenciesRoute,
};
