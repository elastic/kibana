/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { APMDownstreamDependency } from '@kbn/apm-types';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import {
  type AnalyzerApplicability,
  type InvestigationLead,
  type LeadRelationship,
  compareLeads,
} from '@kbn/signal-investigation-contract';
import { anomalySignalBand, changePointSignalBand, timingBand } from '@kbn/signals-server';
import type { ApmAnomalyWithContext } from '../get_apm_service_summary/get_anomalies';
import type { TimeseriesChangePoint } from '../get_apm_timeseries';

export const MAX_DEPENDENCIES = 10;
export const MAX_HOSTS = 10;
export const MAX_LEADS = 25;

export const SERVICE_HOSTS_ANALYZER_ID = 'service_hosts';
export const SERVICE_CHANGE_POINTS_ANALYZER_ID = 'service_change_points';
export const DEPENDENCY_CHANGE_POINTS_ANALYZER_ID = 'dependency_change_points';
export const SERVICE_ANOMALIES_ANALYZER_ID = 'service_anomalies';

export const apmChangePointApplicability = (seed: InvestigationSeed): AnalyzerApplicability => {
  if (!seed.entities['service.name']) {
    return {
      applicable: false,
      status: 'not_applicable',
      message: i18n.translate('xpack.apm.signalInvestigation.needsServiceName', {
        defaultMessage: 'This analysis needs a service name.',
      }),
    };
  }
  return { applicable: true };
};

export const mlNotAvailableMessage = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.mlNotAvailable', {
    defaultMessage: 'Skipped: ML not available',
  });

export const apmAnomalyApplicability = (
  seed: InvestigationSeed,
  hasMlPlugin = true
): AnalyzerApplicability => {
  if (!hasMlPlugin) {
    return {
      applicable: false,
      status: 'skipped',
      message: mlNotAvailableMessage(),
    };
  }
  return apmChangePointApplicability(seed);
};

const changeTypeLabel = (type: string): string => {
  switch (type) {
    case 'spike':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.spike', {
        defaultMessage: 'spike',
      });
    case 'dip':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.dip', {
        defaultMessage: 'dip',
      });
    case 'step_change':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.stepChange', {
        defaultMessage: 'step change',
      });
    case 'trend_change':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.trendChange', {
        defaultMessage: 'trend change',
      });
    case 'distribution_change':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.distributionChange', {
        defaultMessage: 'distribution change',
      });
    case 'non_stationary':
      return i18n.translate('xpack.apm.signalInvestigation.changeType.nonStationary', {
        defaultMessage: 'non-stationary change',
      });
    default:
      return type;
  }
};

export const leadFromChangePoint = ({
  analyzerId,
  metric,
  subject,
  relationship,
  relevance,
  change,
  anchorStart,
  anchorEnd,
  locatorParams,
}: {
  analyzerId: string;
  metric: string;
  subject: string;
  relationship: LeadRelationship;
  relevance: string;
  change: TimeseriesChangePoint;
  anchorStart: string;
  anchorEnd: string;
  locatorParams?: Readonly<Record<string, string | number>>;
}): InvestigationLead => ({
  id: [analyzerId, subject, metric, change.date ?? 'unknown', change.type].join(':'),
  analyzerId,
  summary: i18n.translate('xpack.apm.signalInvestigation.changePointSummary', {
    defaultMessage: '{metric} {changeType} on {subject}',
    values: { metric, changeType: changeTypeLabel(change.type), subject },
  }),
  occurredAt: change.date,
  relevance,
  ranking: {
    signal: changePointSignalBand(change.p_value),
    timing: timingBand(change.date, anchorStart, anchorEnd),
    relationship,
  },
  locatorParams,
});

export const selectDependencies = (
  dependencies: readonly APMDownstreamDependency[]
): { selected: APMDownstreamDependency[]; total: number } => {
  const sorted = [...dependencies].sort(
    (left, right) => (right.throughputPerMin ?? 0) - (left.throughputPerMin ?? 0)
  );
  return { selected: sorted.slice(0, MAX_DEPENDENCIES), total: dependencies.length };
};

export const selectHosts = (
  hostNames: readonly string[]
): { selected: string[]; total: number } => {
  const unique = Array.from(
    new Set(hostNames.filter((host): host is string => typeof host === 'string' && host.length > 0))
  );
  return { selected: unique.slice(0, MAX_HOSTS), total: unique.length };
};

const anomalyMetricLabel = (metricName: string): string => {
  switch (metricName) {
    case 'transaction_latency':
      return i18n.translate('xpack.apm.signalInvestigation.anomalyMetric.latency', {
        defaultMessage: 'Transaction latency',
      });
    case 'transaction_throughput':
      return i18n.translate('xpack.apm.signalInvestigation.anomalyMetric.throughput', {
        defaultMessage: 'Transaction throughput',
      });
    case 'transaction_failure_rate':
      return i18n.translate('xpack.apm.signalInvestigation.anomalyMetric.failureRate', {
        defaultMessage: 'Transaction failure rate',
      });
    case 'transaction_low_count':
      return i18n.translate('xpack.apm.signalInvestigation.anomalyMetric.lowCount', {
        defaultMessage: 'Transaction count',
      });
    default:
      return metricName;
  }
};

export const leadFromAnomaly = ({
  anomaly,
  serviceName,
  anchorStart,
  anchorEnd,
}: {
  anomaly: ApmAnomalyWithContext;
  serviceName: string;
  anchorStart: string;
  anchorEnd: string;
}): InvestigationLead => {
  const transactionType = anomaly['transaction.type'] || 'request';
  const metric = anomalyMetricLabel(anomaly.metricName);
  const score = Math.round(Number(anomaly.anomalyScore ?? 0));
  return {
    id: [
      SERVICE_ANOMALIES_ANALYZER_ID,
      anomaly.jobId,
      serviceName,
      transactionType,
      anomaly.metricName,
      anomaly['@timestamp'],
    ].join(':'),
    analyzerId: SERVICE_ANOMALIES_ANALYZER_ID,
    summary: i18n.translate('xpack.apm.signalInvestigation.anomalySummary', {
      defaultMessage: '{metric} anomaly on {serviceName} ({transactionType}, score {score})',
      values: { metric, serviceName, transactionType, score },
    }),
    occurredAt: anomaly['@timestamp'],
    relevance: sameServiceRelevance(),
    ranking: {
      signal: anomalySignalBand(anomaly.anomalyScore),
      timing: timingBand(anomaly['@timestamp'], anchorStart, anchorEnd),
      relationship: 'service',
    },
    locatorParams: {
      serviceName,
      ...(anomaly['service.environment'] ? { environment: anomaly['service.environment'] } : {}),
      ...(anomaly['transaction.type'] ? { transactionType: anomaly['transaction.type'] } : {}),
      jobId: anomaly.jobId,
      detectorIndex: anomaly.detectorIndex,
      rangeFrom: anchorStart,
      rangeTo: anchorEnd,
    },
  };
};

export const capLeads = (
  leads: readonly InvestigationLead[]
): { leads: InvestigationLead[]; truncated: boolean } => {
  const ranked = [...leads].sort(compareLeads);
  return { leads: ranked.slice(0, MAX_LEADS), truncated: ranked.length > MAX_LEADS };
};

export const sameServiceRelevance = (): string =>
  i18n.translate('xpack.apm.signalInvestigation.sameService', { defaultMessage: 'Same service' });

export const dependencyRelevance = (name: string): string =>
  i18n.translate('xpack.apm.signalInvestigation.oneHopDependency', {
    defaultMessage: 'One-hop dependency {name}',
    values: { name },
  });
