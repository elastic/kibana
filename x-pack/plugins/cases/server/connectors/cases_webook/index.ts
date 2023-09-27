/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../../../common/types/domain';
import { getMapping } from './mapping';
import { format } from './format';
import type { CasesWebhookCaseConnector } from './types';

export const getCaseConnector = (): CasesWebhookCaseConnector => ({
  getMapping,
  format,
  getSupportedUserActions: () => [
    UserActionTypes.comment,
    UserActionTypes.description,
    UserActionTypes.tags,
    UserActionTypes.title,
    UserActionTypes.severity,
    UserActionTypes.status,
  ],
});
