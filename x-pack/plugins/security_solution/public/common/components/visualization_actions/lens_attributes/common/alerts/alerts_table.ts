/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GenericIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { GetLensAttributes } from '../../../types';

const layerId = uuidv4();
const topValuesOfStackByFieldColumnId = uuidv4();
const countOfBreakdownFieldColumnId = uuidv4();
const topValuesOfBreakdownFieldColumnId = uuidv4();
const defaultColumn = {
  columnId: topValuesOfStackByFieldColumnId,
  isTransposed: false,
  width: 362,
};
const breakdownFieldColumns = [
  {
    columnId: countOfBreakdownFieldColumnId,
    isTransposed: false,
  },
  {
    columnId: topValuesOfBreakdownFieldColumnId,
    isTransposed: false,
  },
];
const defaultColumnOrder = [topValuesOfStackByFieldColumnId];

export const getAlertsTableLensAttributes: GetLensAttributes = (
  stackByField = 'kibana.alert.rule.name',
  extraOptions
) => {
  const columnOrder = extraOptions?.breakdownField
    ? [...defaultColumnOrder, topValuesOfBreakdownFieldColumnId, countOfBreakdownFieldColumnId]
    : defaultColumnOrder;

  const columnSettings = {
    [topValuesOfStackByFieldColumnId]: {
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
          columnId: countOfBreakdownFieldColumnId,
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
    [countOfBreakdownFieldColumnId]: {
      label: `Count of ${extraOptions?.breakdownField}`,
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: extraOptions?.breakdownField,
      params: {
        emptyAsNull: true,
      },
    },
    [topValuesOfBreakdownFieldColumnId]: {
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
          columnId: countOfBreakdownFieldColumnId,
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
  };

  return {
    title: 'Alerts',
    description: '',
    visualizationType: 'lnsDatatable',
    state: {
      visualization: {
        columns: [defaultColumn, ...breakdownFieldColumns],
        layerId,
        layerType: 'data',
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
              columns: columnOrder.reduce<Record<string, GenericIndexPatternColumn>>(
                (acc, colId) => {
                  if (colId && columnSettings[colId]) {
                    acc[colId] = columnSettings[colId];
                  }
                  return acc;
                },
                {}
              ),
              columnOrder,
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
