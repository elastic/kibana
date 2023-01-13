/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetLensAttributes } from '../../../types';

export const getRiskScoreDonutAttributes: GetLensAttributes = (
  stackByField,
  extraOptions = { spaceId: 'default' }
) => ({
  title: `${stackByField} risk donut`,
  description: '',
  visualizationType: 'lnsPie',
  state: {
    visualization: {
      shape: 'donut',
      layers: [
        {
          layerId: '4aa7cf71-cf20-4e62-8ca6-ca6be6b0988b',
          primaryGroups: [],
          metrics: ['f04a71a3-399f-4d32-9efc-8a005e989991'],
          numberDisplay: 'value',
          categoryDisplay: 'hide',
          legendDisplay: 'hide',
          nestedLegend: true,
          layerType: 'data',
          legendSize: 'xlarge',
          legendPosition: 'right',
          percentDecimals: 2,
          emptySizeRatio: 0.8,
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '4aa7cf71-cf20-4e62-8ca6-ca6be6b0988b': {
            columns: {
              'f04a71a3-399f-4d32-9efc-8a005e989991': {
                label: 'Total',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['f04a71a3-399f-4d32-9efc-8a005e989991'],
            sampling: 1,
            incompleteColumns: {},
          },
        },
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: '40a4d4c8-b5da-4bb7-8961-a84ce0b73fa0',
        name: 'indexpattern-datasource-layer-4aa7cf71-cf20-4e62-8ca6-ca6be6b0988b',
      },
    ],
    adHocDataViews: {
      '40a4d4c8-b5da-4bb7-8961-a84ce0b73fa0': {
        id: '40a4d4c8-b5da-4bb7-8961-a84ce0b73fa0',
        title: `ml_${stackByField}_risk_score_latest_${extraOptions.spaceId}`,
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: `ml_${stackByField}_risk_score_latest_${extraOptions.spaceId}`,
      },
    },
  },
  references: [],
});
