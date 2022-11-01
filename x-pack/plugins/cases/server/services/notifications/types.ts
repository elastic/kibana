/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAssignees } from '../../../common/api';
import type { CaseSavedObject } from '../../common/types';

export interface NotifyArgs {
  assignees: CaseAssignees;
  theCase: CaseSavedObject;
}

export interface NotificationService {
  notifyAssignees: (args: NotifyArgs) => Promise<void>;
  bulkNotifyAssignees: (args: NotifyArgs[]) => Promise<void>;
}
