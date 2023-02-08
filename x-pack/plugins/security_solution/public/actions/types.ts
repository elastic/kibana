/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata?: {
    /**
     * `metadata.scopeId` is used by some actions (e.g. filterIn/Out) to discriminate the Timeline
     * and the DataTables (alerts, events, rules preview..) actions execution.
     * It is required when cellActions are attached inside the Timeline or dataTable scope,
     * it can be omitted in otherwise.
     */
    scopeId?: string;
  };
}

export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;
