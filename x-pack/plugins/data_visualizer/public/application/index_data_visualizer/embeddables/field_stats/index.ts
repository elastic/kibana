/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { DataVisualizerCoreSetup } from '../../../../plugin';
import { FIELD_STATS_EMBEDDABLE_TYPE } from './constants';

export const registerEmbeddables = (embeddable: EmbeddableSetup, core: DataVisualizerCoreSetup) => {
  embeddable.registerReactEmbeddableFactory(FIELD_STATS_EMBEDDABLE_TYPE, async () => {
    const { getFieldStatsChartEmbeddableFactory } = await import('./field_stats_factory');
    return getFieldStatsChartEmbeddableFactory(core.getStartServices);
  });
};
