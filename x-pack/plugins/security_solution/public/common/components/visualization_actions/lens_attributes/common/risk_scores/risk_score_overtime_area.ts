/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { GetLensAttributes } from '../../../types';
export const getRiskScoreOverTimeAreaAttributes: GetLensAttributes = (
  stackByField,
  extraOptions = { spaceId: 'default' }
) => {
  const layerId = uuid.v4();
  const internalReferenceId = uuid.v4();
  return {
    title: `${stackByField} risk score over time`,
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: true,
          position: 'right',
        },
        valueLabels: 'hide',
        preferredSeriesType: 'line',
        layers: [
          {
            layerId,
            accessors: [
              '8886a925-4419-4d9a-8498-3bda4ecf1b0a',
              'df9461a3-db14-4196-932c-6404dabfd11a',
            ],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '02a55c97-d7a4-440d-ac77-33b941c16189',
            yConfig: [
              {
                forAccessor: 'df9461a3-db14-4196-932c-6404dabfd11a',
                color: '#c06060',
              },
            ],
          },
        ],
        xTitle: '',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        yTitle: '',
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                '02a55c97-d7a4-440d-ac77-33b941c16189': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                '8886a925-4419-4d9a-8498-3bda4ecf1b0a': {
                  label: 'Risk score',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: `${stackByField}.risk.calculated_score_norm`,
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: true,
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                      },
                    },
                  },
                  customLabel: true,
                },
                'df9461a3-db14-4196-932c-6404dabfd11aX0': {
                  label: 'Part of Risky threshold',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: 70,
                  },
                  references: [],
                  customLabel: true,
                },
                'df9461a3-db14-4196-932c-6404dabfd11a': {
                  label: 'Risky threshold',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    formula: '70',
                    isFormulaBroken: false,
                  },
                  references: ['df9461a3-db14-4196-932c-6404dabfd11aX0'],
                  customLabel: true,
                },
              },
              columnOrder: [
                '02a55c97-d7a4-440d-ac77-33b941c16189',
                '8886a925-4419-4d9a-8498-3bda4ecf1b0a',
                'df9461a3-db14-4196-932c-6404dabfd11a',
                'df9461a3-db14-4196-932c-6404dabfd11aX0',
              ],
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
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: `ml_${stackByField}_risk_score_${extraOptions.spaceId}`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `ml_${stackByField}_risk_score_${extraOptions.spaceId}`,
        },
      },
    },
    references: [],
  };
};
