/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DegradedFieldSortField } from '../../hooks';
import {
  DatasetQualityDetailsControllerContext,
  DEFAULT_CONTEXT,
} from '../../state_machines/dataset_quality_details_controller';
import { DatasetQualityDetailsPublicState, DatasetQualityDetailsPublicStateUpdate } from './types';

export const getPublicStateFromContext = (
  context: DatasetQualityDetailsControllerContext
): DatasetQualityDetailsPublicState => {
  return {
    dataStream: context.dataStream,
    degradedFields: context.degradedFields,
    timeRange: context.timeRange,
    breakdownField: context.breakdownField,
    integration: context.integration,
    expandedDegradedField: context.expandedDegradedField,
    showCurrentQualityIssues: context.showCurrentQualityIssues,
  };
};

export const getContextFromPublicState = (
  publicState: DatasetQualityDetailsPublicStateUpdate
): DatasetQualityDetailsControllerContext => ({
  ...DEFAULT_CONTEXT,
  degradedFields: {
    table: {
      ...DEFAULT_CONTEXT.degradedFields.table,
      ...publicState.degradedFields?.table,
      sort: publicState.degradedFields?.table?.sort
        ? {
            ...publicState.degradedFields.table.sort,
            field: publicState.degradedFields.table.sort.field as DegradedFieldSortField,
          }
        : DEFAULT_CONTEXT.degradedFields.table.sort,
    },
  },
  timeRange: {
    ...DEFAULT_CONTEXT.timeRange,
    ...publicState.timeRange,
    refresh: {
      ...DEFAULT_CONTEXT.timeRange.refresh,
      ...publicState.timeRange?.refresh,
    },
  },
  dataStream: publicState.dataStream,
  expandedDegradedField: publicState.expandedDegradedField,
  showCurrentQualityIssues:
    publicState.showCurrentQualityIssues ?? DEFAULT_CONTEXT.showCurrentQualityIssues,
});
