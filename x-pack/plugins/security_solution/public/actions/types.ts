/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata?: {
    scopeId?: string; // needed in dataTables (events/alerts tables) and Timeline
  };
}

export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;
