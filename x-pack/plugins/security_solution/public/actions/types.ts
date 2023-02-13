/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';

interface SecurityMetadata extends Record<string, unknown> {
  /**
   * `metadata.scopeId` is used by some actions (e.g. filterIn/Out) to discriminate the Timeline
   * and the DataTables (alerts, events, rules preview..) actions execution.
   * It is required when cellActions are attached inside the Timeline or dataTable scope,
   * it can be omitted in otherwise.
   */
  scopeId?: string;
  /**
   * `metadata.isObjectArray` is used to display extended tooltip information
   * for fields that have multiple values
   */
  isObjectArray?: boolean;
  /**
   * `metadata.negateFilters` is used by some actions (e.g. filterIn/Out and addToTimeline) to negate
   * the usual filtering behavior. This is used in special cases used where the displayed value is computed
   * and the filtering execution need to perform the opposite operation.
   */
  negateFilters?: boolean;
}

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata: SecurityMetadata | undefined;
}

export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;
