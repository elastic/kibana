/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferenceBasedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';
import type { LensChartConfig, LensLineChartConfig } from '../../../types';
import { getFilters } from './utils';

const REFERENCE_LAYER = 'referenceLayer';

export const loadLineChart: LensLineChartConfig = {
  extraLayers: {
    [REFERENCE_LAYER]: {
      linkToLayers: [],
      columnOrder: ['referenceColumn'],
      columns: {
        referenceColumn: {
          label: 'Reference',
          dataType: 'number',
          operationType: 'static_value',
          isStaticValue: true,
          isBucketed: false,
          scale: 'ratio',
          params: {
            value: 1,
            format: {
              id: 'percent',
              params: {
                decimals: 0,
              },
            },
          },
          references: [],
          customLabel: true,
        } as ReferenceBasedIndexPatternColumn,
      },
      sampling: 1,
      incompleteColumns: {},
    },
  },
  extraVisualizationState: {
    layers: [
      {
        layerId: REFERENCE_LAYER,
        layerType: 'referenceLine',
        accessors: ['referenceColumn'],
        yConfig: [
          {
            forAccessor: 'referenceColumn',
            axisMode: 'left',
            color: '#6092c0',
          },
        ],
      },
    ],
  },
  extraReference: REFERENCE_LAYER,
};

export const load: LensChartConfig = {
  title: 'Normalized Load',
  formula: {
    formula: 'average(system.load.1) / max(system.load.cores)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
  getFilters,
  lineChartConfig: loadLineChart,
};
