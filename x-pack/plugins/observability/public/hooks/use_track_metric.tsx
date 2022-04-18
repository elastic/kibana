/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityApp } from '../../typings/common';

/**
 * Note: The usage_collection plugin will take care of sending this data to the telemetry server.
 * You can find these metrics stored at:
 * stack_stats.kibana.plugins.ui_metric.{app}.{metric}(__delayed_{n}ms)?
 * which will be an array of objects each containing a key, representing the metric, and
 * a value, which will be a counter
 */

interface TrackOptions {
  app?: ObservabilityApp;
  metricType?: UiCounterMetricType;
  delay?: number; // in ms
}
type EffectDeps = unknown[];

interface ServiceDeps {
  usageCollection: UsageCollectionSetup; // TODO: This should really be start. Looking into it.
}

export type TrackMetricOptions = TrackOptions & { metric: string };
export type UiTracker = ReturnType<typeof useUiTracker>;
export type TrackEvent = (options: TrackMetricOptions) => void;

export { METRIC_TYPE };

export function useUiTracker<Services extends ServiceDeps>({
  app: defaultApp,
}: { app?: ObservabilityApp } = {}): TrackEvent {
  const reportUiCounter = useKibana<Services>().services?.usageCollection?.reportUiCounter;
  const trackEvent = useMemo(() => {
    return ({ app = defaultApp, metric, metricType = METRIC_TYPE.COUNT }: TrackMetricOptions) => {
      if (reportUiCounter) {
        reportUiCounter(app as string, metricType, metric);
      }
    };
  }, [defaultApp, reportUiCounter]);
  return trackEvent;
}

export function useTrackMetric<Services extends ServiceDeps>(
  { app, metric, metricType = METRIC_TYPE.COUNT, delay = 0 }: TrackMetricOptions,
  effectDependencies: EffectDeps = []
) {
  const reportUiCounter = useKibana<Services>().services?.usageCollection?.reportUiCounter;

  useEffect(() => {
    if (!reportUiCounter) {
      // eslint-disable-next-line no-console
      console.log(
        'usageCollection.reportUiCounter is unavailable. Ensure this is setup via <KibanaContextProvider />.'
      );
    } else {
      let decoratedMetric = metric;
      if (delay > 0) {
        decoratedMetric += `__delayed_${delay}ms`;
      }
      const id = setTimeout(
        () => reportUiCounter(app as string, metricType, decoratedMetric),
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
