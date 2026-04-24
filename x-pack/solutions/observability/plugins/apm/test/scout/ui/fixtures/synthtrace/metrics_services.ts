/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  APM_METRICS_DASHBOARD_SERVICES,
  APM_METRICS_NON_DASHBOARD_SERVICES,
} from '@kbn/synthtrace/src/scenarios/helpers/apm_metrics_dashboards';
import { METRICS_ENVIRONMENT } from '../constants';

const METRIC_SERVICES = [
  ...APM_METRICS_DASHBOARD_SERVICES,
  ...APM_METRICS_NON_DASHBOARD_SERVICES.filter((s) => s.runtimeName === 'jruby'),
];

export function metricsServices({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const instances = METRIC_SERVICES.map((config) => {
    const instance = apm
      .service({
        name: config.name,
        environment: METRICS_ENVIRONMENT,
        agentName: config.agentName,
      })
      .instance(`${config.name}-instance`);

    const fields = instance.fields as Record<string, unknown>;

    if (config.runtimeVersion) {
      fields['service.runtime.version'] = config.runtimeVersion;
    }
    if (config.runtimeName) {
      fields['service.runtime.name'] = config.runtimeName;
    }
    if (config.telemetrySdkName) {
      fields['telemetry.sdk.name'] = config.telemetrySdkName;
    }
    if (config.telemetrySdkLanguage) {
      fields['telemetry.sdk.language'] = config.telemetrySdkLanguage;
    }

    return { instance, config };
  });

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      instances.flatMap(({ instance, config }) => {
        const baseMetrics = {
          'system.cpu.total.norm.pct': 0.4,
          'system.memory.actual.free': 2_000_000_000,
          'system.memory.total': 8_000_000_000,
        };

        const extraList = Array.isArray(config.extraMetrics)
          ? config.extraMetrics
          : config.extraMetrics
          ? [config.extraMetrics]
          : [{}];

        const metricsets = extraList.map((extra) => {
          const metricset = instance.appMetrics(baseMetrics).timestamp(timestamp);
          Object.assign(metricset.fields, extra);
          return metricset;
        });

        return [
          instance
            .transaction({ transactionName: 'GET /api/metrics' })
            .timestamp(timestamp)
            .duration(200)
            .success(),
          ...metricsets,
        ];
      })
    );
}
