/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction, CellActionExecutionContext } from '@kbn/cell-actions';
import type { TimelineTabs } from '../../common/types';

export interface SecurityCellActionExecutionContext extends CellActionExecutionContext {
  metadata?: {
    scopeId?: string; // needed in all cellActions
    timelineTab?: TimelineTabs; // needed in cellActions inside timeline
  };
}

export type SecurityCellAction = CellAction<SecurityCellActionExecutionContext>;
