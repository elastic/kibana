/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableActionsColumnType } from '@elastic/eui';
import type { TransformConfigUnion, TransformId } from '../../../common/types/transform';
import type { TransformStats } from '../../../common/types/transform_stats';
import type { TransformHealthAlertRule } from '../../../common/types/alerting';

// Used to pass on attribute names to table columns
export enum TRANSFORM_LIST_COLUMN {
  DESCRIPTION = 'config.description',
  ID = 'id',
}

export interface TransformListRow {
  id: TransformId;
  config: TransformConfigUnion;
  mode?: string; // added property on client side to allow filtering by this field
  stats: TransformStats;
  alerting_rules?: TransformHealthAlertRule[];
}

// The single Action type is not exported as is
// from EUI so we use that code to get the single
// Action type from the array of actions.
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number];
export type TransformListAction = ArrayElement<
  EuiTableActionsColumnType<TransformListRow>['actions']
>;
