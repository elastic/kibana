/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetLensAttributes, LensAttributes } from '../../types';

export const getExternalAlertLensAttributes: GetLensAttributes = (
  stackByField = 'event.module'
) => {
  return {
    title: 'External alerts',
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: 'a3c54471-615f-4ff9-9fda-69b5b2ea3eef',
            accessors: ['0a923af2-c880-4aa3-aa93-a0b9c2801f6d'],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '37bdf546-3c11-4b08-8c5d-e37debc44f1d',
            splitAccessor: '42334c6e-98d9-47a2-b4cb-a445abb44c93',
          },
        ],
        yRightExtent: {
          mode: 'full',
        },
        yLeftExtent: {
          mode: 'full',
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [
        {
          meta: {
            index: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'event.kind',
            params: {
              query: 'alert',
            },
          },
          query: {
            match_phrase: {
              'event.kind': 'alert',
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ],
      datasourceStates: {
        indexpattern: {
          layers: {
            'a3c54471-615f-4ff9-9fda-69b5b2ea3eef': {
              columns: {
                '37bdf546-3c11-4b08-8c5d-e37debc44f1d': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                  },
                },
                '0a923af2-c880-4aa3-aa93-a0b9c2801f6d': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                '42334c6e-98d9-47a2-b4cb-a445abb44c93': {
                  label: `Top values of ${stackByField}`, // could be event.category
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: `${stackByField}`, // could be event.category
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: '0a923af2-c880-4aa3-aa93-a0b9c2801f6d',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                  },
                },
              },
              columnOrder: [
                '42334c6e-98d9-47a2-b4cb-a445abb44c93',
                '37bdf546-3c11-4b08-8c5d-e37debc44f1d',
                '0a923af2-c880-4aa3-aa93-a0b9c2801f6d',
              ],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-a3c54471-615f-4ff9-9fda-69b5b2ea3eef',
      },
      {
        type: 'index-pattern',
        name: '723c4653-681b-4105-956e-abef287bf025',
        id: '{dataViewId}',
      },
      {
        type: 'index-pattern',
        name: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
        id: '{dataViewId}',
      },
    ],
  } as LensAttributes;
};
