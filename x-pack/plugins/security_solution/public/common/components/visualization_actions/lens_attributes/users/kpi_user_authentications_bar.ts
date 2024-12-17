/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes, GetLensAttributes } from '../../types';
import { FAIL_CHART_LABEL, SUCCESS_CHART_LABEL } from '../../translations';

const columnEventOutcomeFailure = 'c8165fc3-7180-4f1b-8c87-bc3ea04c6df7';
const columnEventOutcomeFailureFilter = 'e959c351-a3a2-4525-b244-9623f215a8fd';

const columnEventOutcomeSuccess = '938b445a-a291-4bbc-84fe-4f47b69c20e4';
const columnEventOutcomeSuccessFilter = '430e690c-9992-414f-9bce-00812d99a5e7';

const layerEventOutcomeFailure = 'b9acd453-f476-4467-ad38-203e37b73e55';
const layerEventOutcomeSuccess = '31213ae3-905b-4e88-b987-0cccb1f3209f';

export const getKpiUserAuthenticationsBarLensAttributes: GetLensAttributes = ({ colorSchemas }) =>
  ({
    title: '[Host] User authentications - bar ',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        layers: [
          {
            accessors: [columnEventOutcomeSuccess],
            layerId: layerEventOutcomeSuccess,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnEventOutcomeSuccessFilter,
            yConfig: [],
          },
          {
            accessors: [columnEventOutcomeFailure],
            layerId: layerEventOutcomeFailure,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnEventOutcomeFailureFilter,
            yConfig: [
              {
                color: colorSchemas?.['event.outcome.failure'],
                forAccessor: columnEventOutcomeFailure,
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: false,
        },
        preferredSeriesType: 'bar_horizontal_stacked',
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        valueLabels: 'hide',
        yLeftExtent: {
          mode: 'full',
        },
        yRightExtent: {
          mode: 'full',
        },
      },
      query: {
        language: 'kuery',
        query: '',
      },
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            // @ts-expect-error upgrade typescript v4.9.5
            indexRefName: 'filter-index-pattern-0',
            key: 'query',
            negate: false,
            type: 'custom',
            value: '{"bool":{"filter":[{"term":{"event.category":"authentication"}}]}}',
          },
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'event.category': 'authentication',
                  },
                },
              ],
            },
          },
        },
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerEventOutcomeSuccess]: {
              columnOrder: [columnEventOutcomeSuccessFilter, columnEventOutcomeSuccess],
              columns: {
                [columnEventOutcomeSuccessFilter]: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Filters',
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome : "success" ',
                        },
                        label: SUCCESS_CHART_LABEL,
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
                [columnEventOutcomeSuccess]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: SUCCESS_CHART_LABEL,
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
              },
              incompleteColumns: {},
            },
            [layerEventOutcomeFailure]: {
              columnOrder: [columnEventOutcomeFailureFilter, columnEventOutcomeFailure],
              columns: {
                [columnEventOutcomeFailure]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Fail',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                [columnEventOutcomeFailureFilter]: {
                  customLabel: true,
                  dataType: 'string',
                  isBucketed: true,
                  label: FAIL_CHART_LABEL,
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome:"failure" ',
                        },
                        label: FAIL_CHART_LABEL,
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
              },
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
        name: `indexpattern-datasource-layer-${layerEventOutcomeSuccess}`,
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerEventOutcomeFailure}`,
      },
    ],
  } as LensAttributes);
