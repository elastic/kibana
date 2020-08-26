/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTableActionsColumnType } from '@elastic/eui';

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

// The single Action type is not exported as is
// from EUI so we use that code to get the single
// Action type from the array of actions.
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type TransformListAction = ArrayElement<
  EuiTableActionsColumnType<TransformListRow>['actions']
>;
