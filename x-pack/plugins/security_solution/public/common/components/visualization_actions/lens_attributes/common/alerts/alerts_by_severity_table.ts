/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetLensAttributes } from '../../../types';

export const getAlertsBySeverityTableAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.workflow_status',
  extraOptions
) => ({
  title: 'alerts-table',
  description: '',
  visualizationType: 'lnsDatatable',
  state: {
    visualization: {
      layerId: '51ed355e-6e23-4038-a417-f653a1160370',
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
          '51ed355e-6e23-4038-a417-f653a1160370': {
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
      name: 'indexpattern-datasource-layer-51ed355e-6e23-4038-a417-f653a1160370',
    },
    {
      type: 'index-pattern',
      name: '22752b9b-cfcd-43f0-a6ee-27dd4893edcf',
      id: '{dataViewId}',
    },
  ],
});
