/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from 'src/plugins/data/common';
import { ObsPanel } from './types';

export const logRatePanel: ObsPanel = async (observabilityDataViews, id, coordinates) => {
  const dataView = await observabilityDataViews.getIndexPattern('infra_logs');
  // console.log('logRatePanel', { dataView });

  return {
    gridData: {
      ...coordinates,
      i: id.toString(),
    },
    type: 'lens',
    explicitInput: {
      id: id.toString(),
      attributes: getLensAttributes(dataView),
    },
  };
};

function getLensAttributes(dataView: DataView) {
  return {
    title: 'Log rate per dataset',
    description: '',
    visualizationType: 'lnsXY',
    references: [
      {
        type: 'index-pattern',
        id: dataView.id,
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: dataView.id,
        name: 'indexpattern-datasource-layer-bb4f23e7-58d4-4fea-a4ad-dd5942b0298b',
      },
    ],
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
          isInside: true,
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: 'bb4f23e7-58d4-4fea-a4ad-dd5942b0298b',
            seriesType: 'bar_stacked',
            xAccessor: '4e8b204d-6f5b-45a7-8b80-ace67ce6c02e',
            splitAccessor: 'ddb0ccd3-0eee-4ac4-8166-9cac19ca8e7d',
            accessors: ['b00f51ec-4605-4d7a-8105-3cbc5802aa27'],
            layerType: 'data',
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            'bb4f23e7-58d4-4fea-a4ad-dd5942b0298b': {
              columns: {
                '4e8b204d-6f5b-45a7-8b80-ace67ce6c02e': {
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
                'b00f51ec-4605-4d7a-8105-3cbc5802aa27': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: 'Records',
                },
                'ddb0ccd3-0eee-4ac4-8166-9cac19ca8e7d': {
                  label: 'Top values of event.dataset',
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'event.dataset',
                  isBucketed: true,
                  params: {
                    size: 5,
                    orderBy: {
                      type: 'column',
                      columnId: 'b00f51ec-4605-4d7a-8105-3cbc5802aa27',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                  },
                },
              },
              columnOrder: [
                'ddb0ccd3-0eee-4ac4-8166-9cac19ca8e7d',
                '4e8b204d-6f5b-45a7-8b80-ace67ce6c02e',
                'b00f51ec-4605-4d7a-8105-3cbc5802aa27',
              ],
              incompleteColumns: {},
            },
          },
        },
      },
    },
  };
}
