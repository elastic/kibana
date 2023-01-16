/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { GetLensAttributes } from '../../../types';

export const getRiskScoreDonutAttributes: GetLensAttributes = (
  stackByField,
  extraOptions = { spaceId: 'default' }
) => {
  const layerId = uuid.v4();
  const internalReferenceId = uuid.v4();
  return {
    title: `${stackByField} risk donut`,
    description: '',
    visualizationType: 'lnsPie',
    state: {
      visualization: {
        shape: 'donut',
        layers: [
          {
            layerId,
            primaryGroups: ['a2e8541a-c22f-4e43-8a12-caa33edc5de0'],
            metrics: ['75179122-96fc-40e1-93b4-8e9310af5f06'],
            numberDisplay: 'value',
            categoryDisplay: 'hide',
            legendDisplay: 'hide',
            nestedLegend: true,
            layerType: 'data',
            legendSize: 'small',
            legendPosition: 'right',
            percentDecimals: 2,
            emptySizeRatio: 0.8,
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                'a2e8541a-c22f-4e43-8a12-caa33edc5de0': {
                  label: 'Filters',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        label: 'Unknown',
                        input: {
                          query: `${stackByField}.risk.calculated_level : \"Unknown\"`,
                          language: 'kuery',
                        },
                      },
                      {
                        input: {
                          query: `${stackByField}.risk.calculated_level : \"Low\"`,
                          language: 'kuery',
                        },
                        label: 'Low',
                      },
                      {
                        input: {
                          query: `${stackByField}.risk.calculated_level : \"Moderiate\"`,
                          language: 'kuery',
                        },
                        label: 'Moderiate',
                      },
                      {
                        input: {
                          query: `${stackByField}.risk.calculated_level : \"High\"`,
                          language: 'kuery',
                        },
                        label: 'High',
                      },
                      {
                        input: {
                          query: `${stackByField}.risk.calculated_level : \"Critical\"`,
                          language: 'kuery',
                        },
                        label: 'Critical',
                      },
                    ],
                  },
                },
                '75179122-96fc-40e1-93b4-8e9310af5f06': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                'a2e8541a-c22f-4e43-8a12-caa33edc5de0',
                '75179122-96fc-40e1-93b4-8e9310af5f06',
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
      internalReferences: [
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: `ml_${stackByField}_risk_score_latest_${extraOptions.spaceId}`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `ml_${stackByField}_risk_score_latest_${extraOptions.spaceId}`,
        },
      },
    },
    references: [],
  };
};
