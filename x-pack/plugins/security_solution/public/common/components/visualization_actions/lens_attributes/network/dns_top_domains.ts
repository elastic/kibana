/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOP_VALUE, UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

/* Exported from Kibana Saved Object */
export const getDnsTopDomainsLensAttributes: GetLensAttributes = (
  stackByField = 'dns.question.registered_domain',
  extraOptions
) =>
  ({
    title: 'Top domains by dns.question.registered_domain',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'xlarge',
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
          x: false,
          yLeft: false,
          yRight: false,
        },
        valuesInLegend: true,
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: 'b1c3efc6-c886-4fba-978f-3b6bb5e7948a',
            accessors: ['2a4d5e20-f570-48e4-b9ab-ff3068919377'],
            position: 'top',
            seriesType: 'bar_stacked',
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
      filters: extraOptions?.dnsIsPtrIncluded
        ? []
        : [
            // exclude PTR record
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
                // @ts-expect-error upgrade typescript v4.9.5
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
        formBased: {
          layers: {
            'b1c3efc6-c886-4fba-978f-3b6bb5e7948a': {
              columns: {
                'e8842815-2a45-4c74-86de-c19a391e2424': {
                  label: TOP_VALUE(stackByField),
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: '2a4d5e20-f570-48e4-b9ab-ff3068919377',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    secondaryFields: [],
                    parentFormat: {
                      id: 'terms',
                    },
                    accuracyMode: true,
                  },
                },
                'd1452b87-0e9e-4fc0-a725-3727a18e0b37': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                  },
                },
                '2a4d5e20-f570-48e4-b9ab-ff3068919377': {
                  label: UNIQUE_COUNT('dns.question.name'),
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'dns.question.name',
                  isBucketed: false,
                  params: { emptyAsNull: true },
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
      internalReferences: [],
      adHocDataViews: {},
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-b1c3efc6-c886-4fba-978f-3b6bb5e7948a',
      },
    ],
  } as LensAttributes);
