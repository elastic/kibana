/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import { registerReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';

export const registerEmbeddable = (core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>) => {
  registerReactEmbeddableFactory(EMBEDDABLE_CHANGE_POINT_CHART_TYPE, async () => {
    const { getChangePointChartEmbeddableFactory } = await import('./change_point_chart');
    return getChangePointChartEmbeddableFactory(core.getStartServices);
  });
};
