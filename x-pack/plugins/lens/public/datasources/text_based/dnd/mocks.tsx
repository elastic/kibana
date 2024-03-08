/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourceDimensionDropHandlerProps } from '../../../types';
import { TextBasedPrivateState } from '../types';

export const column1 = {
  columnId: 'columnId1',
  fieldName: 'category',
  meta: {
    type: 'string',
  },
};
export const column2 = {
  columnId: 'columnId2',
  fieldName: 'day_of_week_i',
  meta: {
    type: 'number',
  },
};
export const column3 = {
  columnId: 'columnId3',
  fieldName: 'products.base_price',
  meta: {
    type: 'number',
  },
};

export const emptyDimensionTarget = {
  layerId: 'first',
  groupId: 'y',
  isNewColumn: true,
  indexPatternId: 'indexId',
  filterOperations: () => true,
  humanData: {
    groupLabel: 'Horizontal axis',
    layerNumber: 1,
    position: 2,
    label: 'Empty dimension',
    nextLabel: '',
    canDuplicate: true,
  },
  columnId: 'newId',
  id: 'newId',
};

export const numericDraggedColumn = {
  id: column1.columnId,
  layerId: 'first',
  columnId: column1.columnId,
  groupId: 'y',
  isMetricDimension: false,
  indexPatternId: 'indexId',
  humanData: {
    label: 'category',
    groupLabel: 'Horizontal axis',
    position: 1,
    layerNumber: 1,
    canSwap: false,
    canDuplicate: false,
    canCombine: false,
    nextLabel: '',
  },
};

export const notNumericDraggedField = {
  field: 'category',
  id: 'category',
  humanData: {
    label: 'category',
  },
};

export const numericDraggedField = {
  field: 'products.base_price',
  id: 'products.base_price',
  humanData: {
    label: 'products.base_price',
  },
};

export const fieldListNonNumericOnly = [
  {
    columnId: 'category',
    fieldName: 'category',
    meta: {
      type: 'string',
    },
  },
  {
    columnId: 'currency',
    fieldName: 'currency',
    meta: {
      type: 'string',
    },
  },
  {
    columnId: 'products.sold_date',
    fieldName: 'products.sold_date',
    meta: {
      type: 'date',
    },
  },
  {
    columnId: 'products.buyer',
    fieldName: 'products.buyer',
    meta: {
      type: 'string',
    },
  },
];

export const fieldList = [
  {
    columnId: 'category',
    fieldName: 'category',
    meta: {
      type: 'string',
    },
  },
  {
    columnId: 'currency',
    fieldName: 'currency',
    meta: {
      type: 'string',
    },
  },
  {
    columnId: 'products.base_price',
    fieldName: 'products.base_price',
    meta: {
      type: 'number',
    },
  },
  {
    columnId: 'products.price',
    fieldName: 'products.price',
    meta: {
      type: 'number',
    },
  },
];

export const defaultProps = {
  setState: jest.fn(),
  state: {
    layers: {
      first: {
        index: 'indexId',
        query: {
          esql: 'FROM "kibana_sample_data_ecommerce"',
        },
        columns: [column1, column2, column3],
        errors: [],
      },
    },
    indexPatternRefs: [],
  },
  source: numericDraggedColumn,
  target: {
    layerId: 'first',
    groupId: 'y',
    isNewColumn: true,
    isMetricDimension: true,
    indexPatternId: 'indexId',
    filterOperations: () => true,
    humanData: {
      groupLabel: 'Horizontal axis',
      layerNumber: 1,
      position: 2,
      label: 'Empty dimension',
      nextLabel: 'products.price',
      canDuplicate: true,
    },
    columnId: column3.columnId,
    id: column3.columnId,
  },
  targetLayerDimensionGroups: [
    {
      groupId: 'x',
      groupLabel: 'Vertical axis',
      accessors: [
        {
          columnId: 'columnId3',
        },
      ],
      supportsMoreColumns: false,
      dataTestSubj: 'lnsXY_xDimensionPanel',
    },
    {
      groupId: 'y',
      groupLabel: 'Horizontal axis',
      accessors: [
        {
          columnId: 'columnId1',
          triggerIconType: 'disabled',
        },
      ],
      isMetricDimension: true,
      supportsMoreColumns: true,
      requiredMinDimensionCount: 1,
      dataTestSubj: 'lnsXY_yDimensionPanel',
      enableDimensionEditor: true,
    },
    {
      groupId: 'breakdown',
      groupLabel: 'Breakdown',
      accessors: [
        {
          columnId: 'columnId2',
          triggerIconType: 'colorBy',
        },
      ],
      supportsMoreColumns: false,
      dataTestSubj: 'lnsXY_splitDimensionPanel',
      requiredMinDimensionCount: 0,
      enableDimensionEditor: true,
    },
  ],
  dropType: 'duplicate_compatible',
} as unknown as DatasourceDimensionDropHandlerProps<TextBasedPrivateState>;
