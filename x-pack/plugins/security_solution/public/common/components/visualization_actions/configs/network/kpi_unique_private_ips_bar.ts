/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_CHART_LABEL, DESTINATION_CHART_LABEL } from '../../translations';
import { LensAttributes } from '../../types';

export const kpiUniquePrivateIpsBar: LensAttributes = {
  title: '[Network] KPI Unique private IPs - bar chart',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
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
      preferredSeriesType: 'bar_horizontal_stacked',
      layers: [
        {
          layerId: 'e406bf4f-942b-41ac-b516-edb5cef06ec8',
          accessors: ['5acd4c9d-dc3b-4b21-9632-e4407944c36d'],
          position: 'top',
          seriesType: 'bar_horizontal_stacked',
          showGridlines: false,
          layerType: 'data',
          yConfig: [
            {
              forAccessor: '5acd4c9d-dc3b-4b21-9632-e4407944c36d',
              color: '#d36186',
            },
          ],
          xAccessor: 'd9c438c5-f776-4436-9d20-d62dc8c03be8',
        },
        {
          layerId: '38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7',
          seriesType: 'bar_horizontal_stacked',
          accessors: ['d27e0966-daf9-41f4-9033-230cf1e76dc9'],
          layerType: 'data',
          yConfig: [
            {
              forAccessor: 'd27e0966-daf9-41f4-9033-230cf1e76dc9',
              color: '#9170b8',
            },
          ],
          xAccessor: '4607c585-3af3-43b9-804f-e49b27796d79',
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
          'e406bf4f-942b-41ac-b516-edb5cef06ec8': {
            columns: {
              '5acd4c9d-dc3b-4b21-9632-e4407944c36d': {
                label: SOURCE_CHART_LABEL,
                dataType: 'number',
                isBucketed: false,
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'source.ip',
                filter: {
                  query:
                    'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
                  language: 'kuery',
                },
              },
              'd9c438c5-f776-4436-9d20-d62dc8c03be8': {
                label: 'Filters',
                dataType: 'string',
                operationType: 'filters',
                scale: 'ordinal',
                isBucketed: true,
                params: {
                  filters: [
                    {
                      input: {
                        query: '',
                        language: 'kuery',
                      },
                      label: SOURCE_CHART_LABEL,
                    },
                  ],
                },
              },
            },
            columnOrder: [
              'd9c438c5-f776-4436-9d20-d62dc8c03be8',
              '5acd4c9d-dc3b-4b21-9632-e4407944c36d',
            ],
            incompleteColumns: {},
          },
          '38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7': {
            columns: {
              'd27e0966-daf9-41f4-9033-230cf1e76dc9': {
                label: DESTINATION_CHART_LABEL,
                dataType: 'number',
                isBucketed: false,
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'destination.ip',
                filter: {
                  query:
                    '"destination.ip": "10.0.0.0/8" or "destination.ip": "192.168.0.0/16" or "destination.ip": "172.16.0.0/12" or "destination.ip": "fd00::/8"',
                  language: 'kuery',
                },
              },
              '4607c585-3af3-43b9-804f-e49b27796d79': {
                label: 'Filters',
                dataType: 'string',
                operationType: 'filters',
                scale: 'ordinal',
                isBucketed: true,
                params: {
                  filters: [
                    {
                      input: {
                        query: '',
                        language: 'kuery',
                      },
                      label: DESTINATION_CHART_LABEL,
                    },
                  ],
                },
              },
            },
            columnOrder: [
              '4607c585-3af3-43b9-804f-e49b27796d79',
              'd27e0966-daf9-41f4-9033-230cf1e76dc9',
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
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-e406bf4f-942b-41ac-b516-edb5cef06ec8',
    },
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7',
    },
  ],

  // description: '',
  // state: {
  //   datasourceStates: {
  //     indexpattern: {
  //       layers: {
  //         '8be0156b-d423-4a39-adf1-f54d4c9f2e69': {
  //           columnOrder: [
  //             'f8bfa719-5c1c-4bf2-896e-c318d77fc08e',
  //             '32f66676-f4e1-48fd-b7f8-d4de38318601',
  //           ],
  //           columns: {
  //             '32f66676-f4e1-48fd-b7f8-d4de38318601': {
  //               dataType: 'number',
  //               filter: {
  //                 language: 'kuery',
  //                 query:
  //                   'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
  //               },
  //               isBucketed: false,
  //               label: 'Unique count of source.ip',
  //               operationType: 'unique_count',
  //               scale: 'ratio',
  //               sourceField: 'source.ip',
  //             },
  //             'f8bfa719-5c1c-4bf2-896e-c318d77fc08e': {
  //               dataType: 'string',
  //               isBucketed: true,
  //               label: 'Filters',
  //               operationType: 'filters',
  //               params: { filters: [{ input: { language: 'kuery', query: '' }, label: 'Src.' }] },
  //               scale: 'ordinal',
  //             },
  //           },
  //           incompleteColumns: {},
  //         },
  //         'ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e': {
  //           columnOrder: [
  //             'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff',
  //             'b7e59b08-96e6-40d1-84fd-e97b977d1c47',
  //           ],
  //           columns: {
  //             'b7e59b08-96e6-40d1-84fd-e97b977d1c47': {
  //               dataType: 'number',
  //               filter: {
  //                 language: 'kuery',
  //                 query:
  //                   '"destination.ip": "10.0.0.0/8" or "destination.ip": "192.168.0.0/16" or "destination.ip": "172.16.0.0/12" or "destination.ip": "fd00::/8"',
  //               },
  //               isBucketed: false,
  //               label: 'Unique count of destination.ip',
  //               operationType: 'unique_count',
  //               scale: 'ratio',
  //               sourceField: 'destination.ip',
  //             },
  //             'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff': {
  //               customLabel: true,
  //               dataType: 'string',
  //               isBucketed: true,
  //               label: 'Dest.',
  //               operationType: 'filters',
  //               params: {
  //                 filters: [{ input: { language: 'kuery', query: '' }, label: 'Dest.' }],
  //               },
  //               scale: 'ordinal',
  //             },
  //           },
  //           incompleteColumns: {},
  //         },
  //       },
  //     },
  //   },
  //   filters: [],
  //   query: { language: 'kuery', query: '' },
  //   visualization: {
  //     axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: true },
  //     fittingFunction: 'None',
  //     gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
  //     labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
  //     layers: [
  //       {
  //         accessors: ['32f66676-f4e1-48fd-b7f8-d4de38318601'],
  //         layerId: '8be0156b-d423-4a39-adf1-f54d4c9f2e69',
  //         layerType: 'data',
  //         seriesType: 'bar_horizontal_stacked',
  //         xAccessor: 'f8bfa719-5c1c-4bf2-896e-c318d77fc08e',
  //         yConfig: [{ color: '#d36186', forAccessor: '32f66676-f4e1-48fd-b7f8-d4de38318601' }],
  //       },
  //       {
  //         accessors: ['b7e59b08-96e6-40d1-84fd-e97b977d1c47'],
  //         layerId: 'ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e',
  //         layerType: 'data',
  //         seriesType: 'bar_horizontal_stacked',
  //         xAccessor: 'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff',
  //         yConfig: [{ color: '#9170b8', forAccessor: 'b7e59b08-96e6-40d1-84fd-e97b977d1c47' }],
  //       },
  //     ],
  //     legend: { isVisible: false, position: 'right', showSingleSeries: false },
  //     preferredSeriesType: 'bar_horizontal_stacked',
  //     tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
  //     valueLabels: 'hide',
  //     yLeftExtent: { mode: 'full' },
  //     yRightExtent: { mode: 'full' },
  //   },
  // },
  // title: '[Host]  KPI Unique IPs - bar',
  // visualizationType: 'lnsXY',
  // references: [
  //   {
  //     id: 'security-solution-default',
  //     name: 'indexpattern-datasource-current-indexpattern',
  //     type: 'index-pattern',
  //   },
  //   {
  //     id: 'security-solution-default',
  //     name: 'indexpattern-datasource-layer-8be0156b-d423-4a39-adf1-f54d4c9f2e69',
  //     type: 'index-pattern',
  //   },
  //   {
  //     id: 'security-solution-default',
  //     name: 'indexpattern-datasource-layer-ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e',
  //     type: 'index-pattern',
  //   },
  //   { id: 'security-solution-default', name: 'tag-ref-security-solution-default', type: 'tag' },
  // ],
} as LensAttributes;
