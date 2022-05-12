/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

/* Exported from Kibana Saved Object */
export const dnsTopDomainsLensAttributes: LensAttributes = {
  title: 'Top domains by dns.question.registered_domain',
  description: 'Security Solution Network DNS',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      fittingFunction: 'None',
      yLeftExtent: {
        mode: 'full',
      },
      yRightExtent: {
        mode: 'full',
      },
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      preferredSeriesType: 'bar',
      layers: [
        {
          layerId: 'b1c3efc6-c886-4fba-978f-3b6bb5e7948a',
          accessors: ['2a4d5e20-f570-48e4-b9ab-ff3068919377'],
          position: 'top',
          seriesType: 'bar',
          showGridlines: false,
          layerType: 'data',
          xAccessor: 'd1452b87-0e9e-4fc0-a725-3727a18e0b37',
          splitAccessor: 'e8842815-2a45-4c74-86de-c19a391e2424',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [
      {
        meta: {
          alias: null,
          negate: true,
          disabled: false,
          type: 'phrase',
          key: 'dns.question.type',
          params: {
            query: 'PTR',
          },
          indexRefName: 'filter-index-pattern-0',
        },
        query: {
          match_phrase: {
            'dns.question.type': 'PTR',
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
          'b1c3efc6-c886-4fba-978f-3b6bb5e7948a': {
            columns: {
              'd1452b87-0e9e-4fc0-a725-3727a18e0b37': {
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
              '2a4d5e20-f570-48e4-b9ab-ff3068919377': {
                label: 'Unique count of dns.question.registered_domain',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'dns.question.registered_domain',
                isBucketed: false,
              },
              'e8842815-2a45-4c74-86de-c19a391e2424': {
                label: 'Top values of dns.question.name',
                dataType: 'string',
                operationType: 'terms',
                scale: 'ordinal',
                sourceField: 'dns.question.name',
                isBucketed: true,
                params: {
                  size: 6,
                  orderBy: {
                    type: 'column',
                    columnId: '2a4d5e20-f570-48e4-b9ab-ff3068919377',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                },
              },
            },
            columnOrder: [
              'e8842815-2a45-4c74-86de-c19a391e2424',
              'd1452b87-0e9e-4fc0-a725-3727a18e0b37',
              '2a4d5e20-f570-48e4-b9ab-ff3068919377',
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
      name: 'indexpattern-datasource-layer-b1c3efc6-c886-4fba-978f-3b6bb5e7948a',
    },
    {
      name: 'filter-index-pattern-0',
      type: 'index-pattern',
      id: '{dataViewId}',
    },
  ],
} as LensAttributes;
