/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { MlCoreSetup } from '../plugin';
import {
  ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
} from './constants';

export * from './constants';
export * from './types';

export function registerEmbeddables(embeddable: EmbeddableSetup, core: MlCoreSetup) {
  embeddable.registerReactEmbeddableFactory(ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, async () => {
    const { getAnomalySwimLaneEmbeddableFactory } = await import('./anomaly_swimlane');
    return getAnomalySwimLaneEmbeddableFactory(core.getStartServices);
  });

  embeddable.registerReactEmbeddableFactory(ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE, async () => {
    const { getAnomalyChartsReactEmbeddableFactory } = await import(
      './anomaly_charts/anomaly_charts_embeddable_factory'
    );
    return getAnomalyChartsReactEmbeddableFactory(core.getStartServices);
  });

  embeddable.registerReactEmbeddableFactory(
    ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
    async () => {
      const { getSingleMetricViewerEmbeddableFactory } = await import('./single_metric_viewer');
      return getSingleMetricViewerEmbeddableFactory(core.getStartServices);
    }
  );
}
