/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CellActions, useDataGridColumnsCellActions } from '@kbn/cell-actions';
import type {
  CellActionsProps,
  UseDataGridColumnsCellActions,
  UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { SecurityMetadata } from '../../../actions/types';
import { SecurityCellActionsTrigger, SecurityCellActionType } from '../../../actions/constants';

// bridge exports for convenience
export * from '@kbn/cell-actions';
export { SecurityCellActionsTrigger, SecurityCellActionType };

export interface SecurityCellActionsProps extends CellActionsProps {
  triggerId: string; // can not use SecurityCellActionsTrigger, React.FC Validation throws error for some reason
  disabledActionTypes?: string[]; // can not use SecurityCellActionType[], React.FC Validation throws error for some reason
  metadata?: SecurityMetadata;
}
export interface UseDataGridColumnsSecurityCellActionsProps
  extends UseDataGridColumnsCellActionsProps {
  triggerId: SecurityCellActionsTrigger;
  disabledActionTypes?: SecurityCellActionType[];
  metadata?: SecurityMetadata;
}

// same components with security cell actions types
export const SecurityCellActions: React.FC<SecurityCellActionsProps> = CellActions;
export const useDataGridColumnsSecurityCellActions: UseDataGridColumnsCellActions<UseDataGridColumnsSecurityCellActionsProps> =
  useDataGridColumnsCellActions;
