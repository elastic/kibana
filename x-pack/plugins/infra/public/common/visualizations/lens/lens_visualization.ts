/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LensAttributes } from '../../../types';
import type { ILensVisualization } from './types';

export const buildLensAttributes = (visualization: ILensVisualization): LensAttributes => {
  return {
    title: visualization.getTitle(),
    visualizationType: visualization.getVisualizationType(),
    references: visualization.getReferences(),
    state: {
      datasourceStates: {
        formBased: {
          layers: visualization.getLayers(),
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: visualization.getVisualizationState(),
      adHocDataViews: visualization.getAdhocDataView(),
    },
  };
};
