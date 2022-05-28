/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiUniqueFlowIdsLensAttributes: LensAttributes = {
  title: '[Network] Unique flow IDs',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '5d46d48f-6ce8-46be-a797-17ad50642564',
      accessor: 'a27f3503-9c73-4fc1-86bb-12461dae4b70',
      layerType: 'data',
    },
    query: {
      query: 'source.ip: * or destination.ip: * ',
      language: 'kuery',
    },
    filters: [
      {
        meta: {
          index: 'c01edc8a-90ce-4d49-95f0-76954a034eb2',
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value:
            '{"bool":{"should":[{"exists":{"field":"source.ip"}},{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}',
        },
        $state: {
          store: 'appState',
        },
        query: {
          bool: {
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    ],
    datasourceStates: {
      indexpattern: {
        layers: {
          '5d46d48f-6ce8-46be-a797-17ad50642564': {
            columns: {
              'a27f3503-9c73-4fc1-86bb-12461dae4b70': {
                label: ' ',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'network.community_id',
                isBucketed: false,
                customLabel: true,
              },
            },
            columnOrder: ['a27f3503-9c73-4fc1-86bb-12461dae4b70'],
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
      name: 'indexpattern-datasource-layer-5d46d48f-6ce8-46be-a797-17ad50642564',
    },
  ],
} as LensAttributes;
