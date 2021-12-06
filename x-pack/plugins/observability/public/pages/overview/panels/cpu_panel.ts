/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObsPanel } from './types';

export const cpuPanel: ObsPanel = async (observabilityDataViews, id, coordinates) => {
  const dataView = await observabilityDataViews.getIndexPattern('infra_metrics');

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
    title: 'CPU by Host',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
          isInside: true,
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        curveType: 'LINEAR',
        xTitle: '',
        yTitle: 'Avg. CPU (%)',
        yLeftExtent: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: 1,
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
        preferredSeriesType: 'line',
        layers: [
          {
            layerId: 'bb4f23e7-58d4-4fea-a4ad-dd5942b0298b',
            accessors: ['58e2fdac-a24a-49b5-b96b-4ac1a730deb6'],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '1c5550b8-dfcd-4ebb-ab63-93875c46f080',
            splitAccessor: '46608776-642c-41e7-afa9-60ea18311929',
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
                '1c5550b8-dfcd-4ebb-ab63-93875c46f080': {
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
                '58e2fdac-a24a-49b5-b96b-4ac1a730deb6': {
                  label: 'Average of host.cpu.usage',
                  dataType: 'number',
                  operationType: 'average',
                  sourceField: 'host.cpu.usage',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    format: {
                      id: 'percent',
                      params: {
                        decimals: 0,
                      },
                    },
                  },
                },
                '46608776-642c-41e7-afa9-60ea18311929': {
                  label: 'Top values of host.name',
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'host.name',
                  isBucketed: true,
                  params: {
                    size: 5,
                    orderBy: {
                      type: 'column',
                      columnId: '58e2fdac-a24a-49b5-b96b-4ac1a730deb6',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                  },
                },
              },
              columnOrder: [
                '46608776-642c-41e7-afa9-60ea18311929',
                '1c5550b8-dfcd-4ebb-ab63-93875c46f080',
                '58e2fdac-a24a-49b5-b96b-4ac1a730deb6',
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
        id: 'infra_metrics_static_index_pattern_id__',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'infra_metrics_static_index_pattern_id__',
        name: 'indexpattern-datasource-layer-bb4f23e7-58d4-4fea-a4ad-dd5942b0298b',
      },
    ],
  };
}
