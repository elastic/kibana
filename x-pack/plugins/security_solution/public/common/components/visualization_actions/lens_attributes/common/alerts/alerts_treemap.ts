/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';

export const getAlertsTreemapLensAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.rule.name',
  extraOptions
) => {
  const layerId = uuidv4();
  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsPie',
    state: {
      visualization: {
        shape: 'treemap',
        layers: [
          {
            layerId,
            primaryGroups: [
              '2881fedd-54b7-42ba-8c97-5175dec86166',
              '75ce269b-ee9c-4c7d-a14e-9226ba0fe059',
            ],
            metrics: ['f04a71a3-399f-4d32-9efc-8a005e989991'],
            numberDisplay: 'value',
            categoryDisplay: 'default',
            legendDisplay: 'show',
            nestedLegend: true,
            layerType: 'data',
            legendSize: 'xlarge',
            legendPosition: 'left',
          },
        ],
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
                '2881fedd-54b7-42ba-8c97-5175dec86166': {
                  label: `Top values of ${stackByField}`,
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 1000,
                    orderBy: {
                      type: 'column',
                      columnId: 'f04a71a3-399f-4d32-9efc-8a005e989991',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                    include: [],
                    exclude: [],
                    includeIsRegex: false,
                    excludeIsRegex: false,
                  },
                },
                '75ce269b-ee9c-4c7d-a14e-9226ba0fe059': {
                  label: `Top values of ${extraOptions?.breakdownField}`,
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: extraOptions?.breakdownField,
                  isBucketed: true,
                  params: {
                    size: 1000,
                    orderBy: {
                      type: 'column',
                      columnId: 'f04a71a3-399f-4d32-9efc-8a005e989991',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                    include: [],
                    exclude: [],
                    includeIsRegex: false,
                    excludeIsRegex: false,
                  },
                },
                'f04a71a3-399f-4d32-9efc-8a005e989991': {
                  label: 'Maximum of kibana.alert.risk_score',
                  dataType: 'number',
                  operationType: 'max',
                  sourceField: 'kibana.alert.risk_score',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                '2881fedd-54b7-42ba-8c97-5175dec86166',
                '75ce269b-ee9c-4c7d-a14e-9226ba0fe059',
                'f04a71a3-399f-4d32-9efc-8a005e989991',
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
    ],
  };
};
