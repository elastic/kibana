/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  };
};

export const getContextFromPublicState = (
  publicState: DatasetQualityPublicStateUpdate
): DatasetQualityControllerContext => ({
  ...DEFAULT_CONTEXT,
  table: {
    ...DEFAULT_CONTEXT.table,
    ...publicState.table,
  },
});
