/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';

export const getAlertsByStatusAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.workflow_status',
  extraOptions
) => {
  const layerId = uuidv4();
  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsPie',
    state: {
      visualization: {
        shape: 'donut',
        layers: [
          {
            layerId,
            primaryGroups: ['a9b43606-7ff7-46ae-a47c-85bed80fab9a'],
            metrics: ['21cc4a49-3780-4b1a-be28-f02fa5303d24'],
            numberDisplay: 'value',
            categoryDisplay: 'hide',
            legendDisplay: 'hide',
            nestedLegend: true,
            layerType: 'data',
            emptySizeRatio: 0.85,
            percentDecimals: 2,
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [
        ...(extraOptions?.status && stackByField
          ? [
              {
                meta: {
                  disabled: false,
                  negate: false,
                  alias: null,
                  index: 'a1aaa83b-5026-444e-9465-50e0afade01c',
                  key: stackByField,
                  field: stackByField,
                  params: {
                    query: extraOptions?.status,
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    [stackByField]: extraOptions?.status,
                  },
                },
              },
            ]
          : []),
        ...(extraOptions?.filters ? extraOptions.filters : []),
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                'a9b43606-7ff7-46ae-a47c-85bed80fab9a': {
                  label: 'Filters',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        input: {
                          query: 'kibana.alert.severity: "critical"',
                          language: 'kuery',
                        },
                        label: 'Critical',
                      },
                      {
                        label: 'High',
                        input: {
                          query: 'kibana.alert.severity : "high" ',
                          language: 'kuery',
                        },
                      },
                      {
                        input: {
                          query: 'kibana.alert.severity: "medium"',
                          language: 'kuery',
                        },
                        label: 'Medium',
                      },
                      {
                        input: {
                          query: 'kibana.alert.severity : "low" ',
                          language: 'kuery',
                        },
                        label: 'Low',
                      },
                    ],
                  },
                },
                '21cc4a49-3780-4b1a-be28-f02fa5303d24': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  filter: {
                    query: '',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                'a9b43606-7ff7-46ae-a47c-85bed80fab9a',
                '21cc4a49-3780-4b1a-be28-f02fa5303d24',
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
      internalReferences: [],
      adHocDataViews: {},
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerId}`,
      },
      {
        type: 'index-pattern',
        name: 'a1aaa83b-5026-444e-9465-50e0afade01c',
        id: '{dataViewId}',
      },
    ],
  };
};
