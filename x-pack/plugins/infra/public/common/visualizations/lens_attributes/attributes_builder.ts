/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LensAttributes, LensVisualizationProperties } from '../../../types';

export const buildLensAttributes = ({
  title,
  visualizationType,
  getReferences,
  getFilters,
  getLayers,
  getVisualizationState,
}: LensVisualizationProperties): LensAttributes => {
  return {
    title,
    visualizationType,
    references: getReferences(),
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: getLayers(),
          },
        },
      },
      filters: getFilters(),
      query: { language: 'kuery', query: '' },
      visualization: getVisualizationState(),
    },
  };
};
