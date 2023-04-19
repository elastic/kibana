/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAssignees } from '../assignees';
import type { ActionTypes } from './common';

export interface AssigneesUserAction {
  type: typeof ActionTypes.assignees;
  payload: {
    assignees: CaseAssignees;
  };
}
