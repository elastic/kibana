/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo } from 'react';
import { METRIC_TYPE, UiStatsMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

/**
 * Note: The usage_collection plugin will take care of sending this data to the telemetry server.
 * You can find these metrics stored at:
 * stack_stats.kibana.plugins.ui_metric.{app}.{metric}(__delayed_{n}ms)?
 * which will be an array of objects each containing a key, representing the metric, and
 * a value, which will be a counter
 */

type ObservabilityApp = 'infra_metrics' | 'infra_logs' | 'apm' | 'uptime';

interface TrackOptions {
  app?: ObservabilityApp;
  metricType?: UiStatsMetricType;
  delay?: number; // in ms
}
type EffectDeps = unknown[];

interface ServiceDeps {
  usageCollection: UsageCollectionSetup; // TODO: This should really be start. Looking into it.
}

export type TrackMetricOptions = TrackOptions & { metric: string };
export type UiTracker = ReturnType<typeof useUiTracker>;

export { METRIC_TYPE };

export function useUiTracker<Services extends ServiceDeps>({
  app: defaultApp,
}: { app?: ObservabilityApp } = {}) {
  const reportUiStats = useKibana<Services>().services?.usageCollection?.reportUiStats;
  const trackEvent = useMemo(() => {
    return ({ app = defaultApp, metric, metricType = METRIC_TYPE.COUNT }: TrackMetricOptions) => {
      if (reportUiStats) {
        reportUiStats(app as string, metricType, metric);
      }
    };
  }, [defaultApp, reportUiStats]);
  return trackEvent;
}

export function useTrackMetric<Services extends ServiceDeps>(
  { app, metric, metricType = METRIC_TYPE.COUNT, delay = 0 }: TrackMetricOptions,
  effectDependencies: EffectDeps = []
) {
  const reportUiStats = useKibana<Services>().services?.usageCollection?.reportUiStats;

  useEffect(() => {
    if (!reportUiStats) {
      // eslint-disable-next-line no-console
      console.log(
        'usageCollection.reportUiStats is unavailable. Ensure this is setup via <KibanaContextProvider />.'
      );
    } else {
      let decoratedMetric = metric;
      if (delay > 0) {
        decoratedMetric += `__delayed_${delay}ms`;
      }
      const id = setTimeout(
        () => reportUiStats(app as string, metricType, decoratedMetric),
        Math.max(delay, 0)
      );
      return () => clearTimeout(id);
    }
    // the dependencies are managed externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, effectDependencies);
}

/**
 * useTrackPageview is a convenience wrapper for tracking a pageview
 * Its metrics will be found at:
 * stack_stats.kibana.plugins.ui_metric.{app}.pageview__{path}(__delayed_{n}ms)?
 */
type TrackPageviewProps = TrackOptions & { path: string };

export function useTrackPageview<Services extends ServiceDeps>(
  { path, ...rest }: TrackPageviewProps,
  effectDependencies: EffectDeps = []
) {
  useTrackMetric<Services>({ ...rest, metric: `pageview__${path}` }, effectDependencies);
}
