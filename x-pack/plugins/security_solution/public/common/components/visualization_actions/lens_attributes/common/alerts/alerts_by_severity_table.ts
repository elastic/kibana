/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';
export const getAlertsBySeverityTableAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.severity',
  extraOptions
) => {
  const layerId = uuidv4();
  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsDatatable',
    state: {
      visualization: {
        layerId,
        layerType: 'data',
        columns: [
          {
            columnId: 'a9b43606-7ff7-46ae-a47c-85bed80fab9a',
          },
          {
            columnId: '21cc4a49-3780-4b1a-be28-f02fa5303d24',
          },
        ],
        headerRowHeight: 'custom',
        headerRowHeightLines: 0.6,
        rowHeight: 'custom',
        rowHeightLines: 0.8,
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: extraOptions?.filters ? extraOptions.filters : [],
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
                          query: `${stackByField}: "critical"`,
                          language: 'kuery',
                        },
                        label: 'Critical',
                      },
                      {
                        label: 'High',
                        input: {
                          query: `${stackByField} : "high"`,
                          language: 'kuery',
                        },
                      },
                      {
                        input: {
                          query: `${stackByField}: "medium"`,
                          language: 'kuery',
                        },
                        label: 'Medium',
                      },
                      {
                        input: {
                          query: `${stackByField} : "low"`,
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
        name: '22752b9b-cfcd-43f0-a6ee-27dd4893edcf',
        id: '{dataViewId}',
      },
    ],
  };
};
