/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { AlertDetailsContextualInsight } from '@kbn/observability-plugin/server/services';
import { APMDownstreamDependency } from '../get_apm_downstream_dependencies';
import { ServiceSummary } from '../get_apm_service_summary';
import { LogCategories } from '../get_log_categories';
import { ApmAnomalies } from '../get_apm_service_summary/get_anomalies';
import { ChangePointGrouping } from '../get_changepoints';

export function getApmAlertDetailsContextPrompt({
  serviceName,
  serviceEnvironment,
  serviceSummary,
  downstreamDependencies,
  logCategories,
  serviceChangePoints,
  exitSpanChangePoints,
  anomalies,
}: {
  serviceName?: string;
  serviceEnvironment?: string;
  serviceSummary?: ServiceSummary;
  downstreamDependencies?: APMDownstreamDependency[];
  logCategories: LogCategories;
  serviceChangePoints?: ChangePointGrouping[];
  exitSpanChangePoints?: ChangePointGrouping[];
  anomalies?: ApmAnomalies;
}): AlertDetailsContextualInsight[] {
  const prompt: AlertDetailsContextualInsight[] = [];
  if (!isEmpty(serviceSummary)) {
    prompt.push({
      key: 'serviceSummary',
      description: 'Metadata for the service where the alert occurred',
      data: serviceSummary,
    });
  }

  if (!isEmpty(downstreamDependencies)) {
    prompt.push({
      key: 'downstreamDependencies',
      description: `Downstream dependencies from the service "${serviceName}". Problems in these services can negatively affect the performance of "${serviceName}"`,
      data: downstreamDependencies,
    });
  }

  if (!isEmpty(serviceChangePoints)) {
    prompt.push({
      key: 'serviceChangePoints',
      description: `Significant change points for "${serviceName}". Use this to spot dips and spikes in throughput, latency and failure rate`,
      data: serviceChangePoints,
    });
  }

  if (!isEmpty(exitSpanChangePoints)) {
    prompt.push({
      key: 'exitSpanChangePoints',
      description: `Significant change points for the dependencies of "${serviceName}". Use this to spot dips or spikes in throughput, latency and failure rate for downstream dependencies`,
      data: exitSpanChangePoints,
    });
  }

  if (!isEmpty(logCategories)) {
    prompt.push({
      key: 'logCategories',
      description: `Log events occurring around the time of the alert`,
      data: logCategories,
    });
  }

  if (!isEmpty(anomalies)) {
    prompt.push({
      key: 'anomalies',
      description: `Anomalies for services running in the environment "${serviceEnvironment}"`,
      data: anomalies,
    });
  }

  return prompt;
}
