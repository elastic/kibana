/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { errors } from '@elastic/elasticsearch';
import { SECURITY_EXTENSION_ID, type Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import pLimit from 'p-limit';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import { changePointWindow } from '@kbn/signals-server';
import type { SignalInvestigationServerSetup } from '@kbn/signal-investigation-plugin/server';
import type {
  SignalAnalyzer,
  SignalAnalyzerDeps,
  SignalAnalyzerResult,
} from '@kbn/signal-investigation-contract';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../../lib/helpers/get_random_sampler';
import type { APMCore } from '../../typings';
import type { MinimalAPMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';
import { createInfraMetricsClientWith } from '../../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
import { getInfrastructureData } from '../../infrastructure/get_infrastructure_data';
import { getContainerHostNames } from '../../infrastructure/get_host_names';
import { getAnomaliesWithContext } from '../get_apm_service_summary/get_anomalies';
import { ApmTimeseriesType, getApmTimeseries } from '../get_apm_timeseries';
import { getApmDownstreamDependencies } from '../get_apm_downstream_dependencies';
import {
  DEPENDENCY_CHANGE_POINTS_ANALYZER_ID,
  SERVICE_ANOMALIES_ANALYZER_ID,
  SERVICE_CHANGE_POINTS_ANALYZER_ID,
  SERVICE_HOSTS_ANALYZER_ID,
  apmAnomalyApplicability,
  apmChangePointApplicability,
  capLeads,
  dependencyRelevance,
  leadFromAnomaly,
  leadFromChangePoint,
  mlNotAvailableMessage,
  sameServiceRelevance,
  selectDependencies,
  selectHosts,
} from './change_point_leads';

const DEPENDENCY_CONCURRENCY = 3;

const latencyTitle = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.metric.latency', {
    defaultMessage: 'Latency',
  });

const p95LatencyTitle = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.metric.p95Latency', {
    defaultMessage: 'p95 latency',
  });

const throughputTitle = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.metric.throughput', {
    defaultMessage: 'Throughput',
  });

const failureRateTitle = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.metric.failureRate', {
    defaultMessage: 'Failure rate',
  });

const errorEventsTitle = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.metric.errorEvents', {
    defaultMessage: 'Error events',
  });

const requireServiceName = (serviceName: string | undefined): string => {
  if (!serviceName) {
    throw new Error('This analysis requires a service name');
  }
  return serviceName;
};

const throwIfAborted = (abortSignal: AbortSignal): void => {
  if (abortSignal.aborted) {
    throw new errors.RequestAbortedError('Request aborted');
  }
};

const eventClientFor = async (
  core: APMCore,
  getApmIndices: ApmDataAccessPluginSetup['getApmIndices'],
  deps: SignalAnalyzerDeps
) => {
  const coreStart = await core.start();
  const coreContext = await deps.context.core;
  return getApmEventClient({
    context: deps.context as unknown as MinimalAPMRouteHandlerResources['context'],
    core,
    params: { query: { _inspect: false } } as MinimalAPMRouteHandlerResources['params'],
    getApmIndices: () => getApmIndices(coreContext.savedObjects.client),
    request: deps.request,
  }).then((apmEventClient) => ({ apmEventClient, coreStart }));
};

const parseWindowMs = (from: string, to: string): { start: number; end: number } => {
  const widened = changePointWindow(from, to);
  const start = datemath.parse(widened.start)?.valueOf() ?? Date.parse(widened.start);
  const end = datemath.parse(widened.end)?.valueOf() ?? Date.parse(widened.end);
  return {
    start: Number.isFinite(start) ? start : 0,
    end: Number.isFinite(end) ? end : Date.now(),
  };
};

const serviceHostsAnalyzer = (
  core: APMCore,
  getApmIndices: ApmDataAccessPluginSetup['getApmIndices'],
  plugins: MinimalAPMRouteHandlerResources['plugins']
): SignalAnalyzer => ({
  id: SERVICE_HOSTS_ANALYZER_ID,
  displayName: i18n.translate('xpack.apm.signalInvestigation.serviceHosts', {
    defaultMessage: 'Service hosts',
  }),
  authz: 'apm',
  getApplicability: apmChangePointApplicability,
  run: async (seed, deps, abortSignal) => {
    const serviceName = requireServiceName(seed.entities['service.name']);
    throwIfAborted(abortSignal);

    const { start, end } = parseWindowMs(seed.timeRange.from, seed.timeRange.to);
    const { apmEventClient } = await eventClientFor(core, getApmIndices, deps);
    const infrastructureData = await getInfrastructureData({
      apmEventClient,
      serviceName,
      environment: seed.entities['service.environment'] ?? ENVIRONMENT_ALL.value,
      agentName: undefined,
      kuery: '',
      start,
      end,
    });
    const coreContext = await deps.context.core;
    const hostNames =
      infrastructureData.containerIds.length > 0
        ? await getContainerHostNames({
            containerIds: infrastructureData.containerIds,
            infraMetricsClient: createInfraMetricsClientWith({
              metricsClient: plugins.metricsDataAccess.setup.client,
              getSavedObjectsClient: async () =>
                coreContext.savedObjects.getClient({
                  excludedExtensions: [SECURITY_EXTENSION_ID],
                }),
              esClient: coreContext.elasticsearch.client.asCurrentUser,
            }),
            start,
            end,
          })
        : infrastructureData.hostNames;
    const { selected, total } = selectHosts(hostNames);
    return {
      leads: [],
      entities: selected.length > 0 ? { 'host.name': selected } : {},
      status: selected.length > 0 ? 'found' : 'no_change',
      message:
        total > selected.length
          ? i18n.translate('xpack.apm.signalInvestigation.hostCap', {
              defaultMessage: 'Showing {shown} of {total} hosts.',
              values: { shown: selected.length, total },
            })
          : undefined,
    };
  },
});

const serviceAnomaliesAnalyzer = ({
  plugins,
  logger,
}: {
  plugins: MinimalAPMRouteHandlerResources['plugins'];
  logger: Logger;
}): SignalAnalyzer => ({
  id: SERVICE_ANOMALIES_ANALYZER_ID,
  displayName: i18n.translate('xpack.apm.signalInvestigation.serviceAnomalies', {
    defaultMessage: 'Service anomalies',
  }),
  authz: 'apm_ml',
  getApplicability: (seed) => apmAnomalyApplicability(seed, Boolean(plugins?.ml?.setup)),
  run: async (seed, deps, abortSignal) => {
    const serviceName = requireServiceName(seed.entities['service.name']);
    throwIfAborted(abortSignal);

    const mlClient = await getMlClient({
      plugins,
      context: deps.context as unknown as MinimalAPMRouteHandlerResources['context'],
      request: deps.request,
    });
    if (!mlClient) {
      return {
        leads: [],
        entities: {},
        status: 'skipped',
        message: mlNotAvailableMessage(),
      };
    }

    const requestedEnvironment = seed.entities['service.environment'];
    const allJobs = await getMlJobsWithAPMGroup(mlClient.anomalyDetectors);
    const coveringJobs = requestedEnvironment
      ? allJobs.filter(
          (job) =>
            job.environment === requestedEnvironment || job.environment === ENVIRONMENT_ALL.value
        )
      : allJobs;

    if (coveringJobs.length === 0) {
      const environmentLabel =
        requestedEnvironment ??
        i18n.translate('xpack.apm.signalInvestigation.allEnvironments', {
          defaultMessage: 'all environments',
        });
      return {
        leads: [],
        entities: {},
        status: 'not_set_up',
        message: i18n.translate('xpack.apm.signalInvestigation.anomalyNotSetUp', {
          defaultMessage: 'Anomaly detection isn’t set up for {environment}.',
          values: { environment: environmentLabel },
        }),
      };
    }

    const { start, end } = parseWindowMs(seed.timeRange.from, seed.timeRange.to);
    const coveringEnvironments = Array.from(new Set(coveringJobs.map((job) => job.environment)));

    const anomalyBatches = await Promise.all(
      coveringEnvironments.map((environment) => {
        throwIfAborted(abortSignal);
        return getAnomaliesWithContext({
          serviceName,
          environment,
          start,
          end,
          mlClient,
          logger,
        });
      })
    );

    const leads = anomalyBatches.flat().map((anomaly) =>
      leadFromAnomaly({
        anomaly,
        serviceName,
        anchorStart: seed.timeRange.from,
        anchorEnd: seed.timeRange.to,
      })
    );

    return resultFromLeads(leads);
  },
});

const serviceChangePointsAnalyzer = (
  core: APMCore,
  getApmIndices: ApmDataAccessPluginSetup['getApmIndices']
): SignalAnalyzer => ({
  id: SERVICE_CHANGE_POINTS_ANALYZER_ID,
  displayName: i18n.translate('xpack.apm.signalInvestigation.serviceChangePoints', {
    defaultMessage: 'Service change points',
  }),
  authz: 'apm',
  getApplicability: apmChangePointApplicability,
  run: async (seed, deps, abortSignal) => {
    const serviceName = requireServiceName(seed.entities['service.name']);
    throwIfAborted(abortSignal);

    const { start, end } = changePointWindow(seed.timeRange.from, seed.timeRange.to);
    const { apmEventClient } = await eventClientFor(core, getApmIndices, deps);
    const environment = seed.entities['service.environment'];
    const series = await getApmTimeseries({
      apmEventClient,
      arguments: {
        start,
        end,
        stats: [
          {
            title: p95LatencyTitle(),
            'service.name': serviceName,
            'service.environment': environment,
            timeseries: {
              name: ApmTimeseriesType.transactionLatency,
              function: LatencyAggregationType.p95,
            },
          },
          {
            title: throughputTitle(),
            'service.name': serviceName,
            'service.environment': environment,
            timeseries: { name: ApmTimeseriesType.transactionThroughput },
          },
          {
            title: failureRateTitle(),
            'service.name': serviceName,
            'service.environment': environment,
            timeseries: { name: ApmTimeseriesType.transactionFailureRate },
          },
          {
            title: errorEventsTitle(),
            'service.name': serviceName,
            'service.environment': environment,
            timeseries: { name: ApmTimeseriesType.errorEventRate },
          },
        ],
      },
    });
    const leads = series.flatMap((item) =>
      item.changes.map((change) =>
        leadFromChangePoint({
          analyzerId: SERVICE_CHANGE_POINTS_ANALYZER_ID,
          metric: item.stat.title,
          subject: serviceName,
          relationship: 'service',
          relevance: sameServiceRelevance(),
          change,
          anchorStart: seed.timeRange.from,
          anchorEnd: seed.timeRange.to,
          locatorParams: {
            serviceName,
            ...(environment ? { environment } : {}),
            rangeFrom: seed.timeRange.from,
            rangeTo: seed.timeRange.to,
          },
        })
      )
    );
    return resultFromLeads(leads);
  },
});

const dependencyChangePointsAnalyzer = (
  core: APMCore,
  getApmIndices: ApmDataAccessPluginSetup['getApmIndices']
): SignalAnalyzer => ({
  id: DEPENDENCY_CHANGE_POINTS_ANALYZER_ID,
  displayName: i18n.translate('xpack.apm.signalInvestigation.dependencyChangePoints', {
    defaultMessage: 'Dependency change points',
  }),
  authz: 'apm',
  getApplicability: apmChangePointApplicability,
  run: async (seed, deps, abortSignal) => {
    const serviceName = requireServiceName(seed.entities['service.name']);
    throwIfAborted(abortSignal);

    const { start, end } = changePointWindow(seed.timeRange.from, seed.timeRange.to);
    const { apmEventClient, coreStart } = await eventClientFor(core, getApmIndices, deps);
    const dependencies = await getApmDownstreamDependencies({
      apmEventClient,
      randomSampler: getRandomSampler({ coreStart, request: deps.request, probability: 1 }),
      arguments: {
        serviceName,
        serviceEnvironment: seed.entities['service.environment'] ?? ENVIRONMENT_ALL.value,
        start,
        end,
      },
    });
    const { selected, total } = selectDependencies(dependencies);
    const limit = pLimit(DEPENDENCY_CONCURRENCY);
    const grouped = await Promise.all(
      selected.map((dependency) =>
        limit(async () => {
          throwIfAborted(abortSignal);
          const resource = dependency['span.destination.service.resource'];
          const series = await getApmTimeseries({
            apmEventClient,
            arguments: {
              start,
              end,
              stats: [
                {
                  title: latencyTitle(),
                  'service.name': serviceName,
                  'service.environment': seed.entities['service.environment'],
                  timeseries: {
                    name: ApmTimeseriesType.exitSpanLatency,
                    'span.destination.service.resource': resource,
                  },
                },
                {
                  title: failureRateTitle(),
                  'service.name': serviceName,
                  'service.environment': seed.entities['service.environment'],
                  timeseries: {
                    name: ApmTimeseriesType.exitSpanFailureRate,
                    'span.destination.service.resource': resource,
                  },
                },
              ],
            },
          });
          return series.flatMap((item) =>
            item.changes.map((change) =>
              leadFromChangePoint({
                analyzerId: DEPENDENCY_CHANGE_POINTS_ANALYZER_ID,
                metric: item.stat.title,
                subject: resource,
                relationship: 'dependency',
                relevance: dependencyRelevance(resource),
                change,
                anchorStart: seed.timeRange.from,
                anchorEnd: seed.timeRange.to,
                locatorParams: {
                  dependencyName: resource,
                  ...(seed.entities['service.environment']
                    ? { environment: seed.entities['service.environment'] }
                    : {}),
                  rangeFrom: seed.timeRange.from,
                  rangeTo: seed.timeRange.to,
                },
              })
            )
          );
        })
      )
    );

    const { leads, truncated } = capLeads(grouped.flat());
    const messages = [
      total > selected.length
        ? i18n.translate('xpack.apm.signalInvestigation.dependencyCap', {
            defaultMessage: 'Showing {shown} of {total} dependencies, by throughput.',
            values: { shown: selected.length, total },
          })
        : undefined,
      truncated ? leadCapMessage(leads.length) : undefined,
    ].filter((message): message is string => message !== undefined);

    return {
      leads,
      entities: {},
      status: leads.length > 0 ? 'found' : 'no_change',
      message: messages.length > 0 ? messages.join(' ') : undefined,
    };
  },
});

const leadCapMessage = (max: number): string =>
  i18n.translate('xpack.apm.signalInvestigation.leadCap', {
    defaultMessage: 'Showing the first {max} leads.',
    values: { max },
  });

const resultFromLeads = (leads: Parameters<typeof capLeads>[0]): SignalAnalyzerResult => {
  const capped = capLeads(leads);
  return {
    leads: capped.leads,
    entities: {},
    status: capped.leads.length > 0 ? 'found' : 'no_change',
    message: capped.truncated ? leadCapMessage(capped.leads.length) : undefined,
  };
};

/** Registers the APM change-point, host, and anomaly analyzers. No-op when Find related changes is disabled. */
export const registerApmSignalAnalyzers = ({
  signalInvestigation,
  core,
  getApmIndices,
  plugins,
  logger,
}: {
  signalInvestigation?: SignalInvestigationServerSetup;
  core: APMCore;
  getApmIndices: ApmDataAccessPluginSetup['getApmIndices'];
  plugins: MinimalAPMRouteHandlerResources['plugins'];
  logger: Logger;
}): void => {
  if (!signalInvestigation) {
    return;
  }
  signalInvestigation.registerAnalyzer(serviceHostsAnalyzer(core, getApmIndices, plugins));
  signalInvestigation.registerAnalyzer(serviceChangePointsAnalyzer(core, getApmIndices));
  signalInvestigation.registerAnalyzer(dependencyChangePointsAnalyzer(core, getApmIndices));
  signalInvestigation.registerAnalyzer(serviceAnomaliesAnalyzer({ plugins, logger }));
};
