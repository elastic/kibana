/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformId } from '../../../common';
import { TransformPivotConfig } from './transform';
import { TransformStats } from './transform_stats';

// Used to pass on attribute names to table columns
export enum TRANSFORM_LIST_COLUMN {
  DESCRIPTION = 'config.description',
  ID = 'id',
}

export interface TransformListRow {
  id: TransformId;
  config: TransformPivotConfig;
  mode?: string; // added property on client side to allow filtering by this field
  stats: TransformStats;
}
