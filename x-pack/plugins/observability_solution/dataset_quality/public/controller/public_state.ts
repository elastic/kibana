/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetTableSortField, DegradedFieldSortField } from '../hooks';
import {
  DatasetQualityControllerContext,
  DEFAULT_CONTEXT,
} from '../state_machines/dataset_quality_controller';
import { DatasetQualityPublicState, DatasetQualityPublicStateUpdate } from './types';

export const getPublicStateFromContext = (
  context: DatasetQualityControllerContext
): DatasetQualityPublicState => {
  return {
    table: context.table,
    flyout: context.flyout,
    filters: context.filters,
  };
};

export const getContextFromPublicState = (
  publicState: DatasetQualityPublicStateUpdate
): DatasetQualityControllerContext => ({
  ...DEFAULT_CONTEXT,
  table: {
    ...DEFAULT_CONTEXT.table,
    ...publicState.table,
    sort: publicState.table?.sort
      ? {
          ...publicState.table?.sort,
          field: publicState.table?.sort.field as DatasetTableSortField,
        }
      : DEFAULT_CONTEXT.table.sort,
  },
  flyout: {
    ...DEFAULT_CONTEXT.flyout,
    ...publicState.flyout,
    degradedFields: {
      table: {
        ...DEFAULT_CONTEXT.flyout.degradedFields.table,
        ...publicState.flyout?.degradedFields?.table,
        sort: publicState.flyout?.degradedFields?.table?.sort
          ? {
              ...publicState.flyout.degradedFields.table.sort,
              field: publicState.flyout.degradedFields.table.sort.field as DegradedFieldSortField,
            }
          : DEFAULT_CONTEXT.flyout.degradedFields.table.sort,
      },
    },
  },
  filters: {
    ...DEFAULT_CONTEXT.filters,
    ...publicState.filters,
  },
});
