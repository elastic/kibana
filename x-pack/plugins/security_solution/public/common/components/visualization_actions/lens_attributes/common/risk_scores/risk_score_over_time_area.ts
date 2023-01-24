/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';
export const getRiskScoreOverTimeAreaAttributes: GetLensAttributes = (
  stackByField,
  extraOptions = { spaceId: 'default' }
) => {
  const layerIds = [uuidv4(), uuidv4()];
  const internalReferenceId = uuidv4();
  const layer2ColumnId = uuidv4();
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
            layerId: layerIds[0],
            accessors: ['8886a925-4419-4d9a-8498-3bda4ecf1b0a'],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '02a55c97-d7a4-440d-ac77-33b941c16189',
            yConfig: [
              {
                forAccessor: '8886a925-4419-4d9a-8498-3bda4ecf1b0a',
                axisMode: 'right',
              },
            ],
          },
          {
            layerId: layerIds[1],
            layerType: 'referenceLine',
            accessors: [layer2ColumnId],
            yConfig: [
              {
                forAccessor: layer2ColumnId,
                axisMode: 'right',
                lineWidth: 2,
                color: '#aa6556',
                icon: 'alert',
                textVisibility: true,
                fill: 'none',
              },
            ],
          },
        ],
        xTitle: '',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
        },
        yTitle: '',
        yRightTitle: '',
        valuesInLegend: true,
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        yRightExtent: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: 100,
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerIds[0]]: {
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
                  operationType: 'max',
                  sourceField: `${stackByField}.risk.calculated_score_norm`,
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                      },
                    },
                    emptyAsNull: true,
                  },
                  customLabel: true,
                },
              },
              columnOrder: [
                '02a55c97-d7a4-440d-ac77-33b941c16189',
                '8886a925-4419-4d9a-8498-3bda4ecf1b0a',
              ],
              sampling: 1,
              incompleteColumns: {},
            },
            [layerIds[1]]: {
              linkToLayers: [],
              columns: {
                [layer2ColumnId]: {
                  label: 'Risky threshold',
                  dataType: 'number',
                  operationType: 'static_value',
                  isStaticValue: true,
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    value: '70',
                  },
                  references: [],
                  customLabel: true,
                },
              },
              columnOrder: [layer2ColumnId],
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
          name: `indexpattern-datasource-layer-${layerIds[0]}`,
        },
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerIds[1]}`,
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
