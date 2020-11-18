/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, CaseField } from '../../../../../case/common/api';

export interface ConectorMappings {
  source: CaseField;
  target: string;
  actionType: ActionType;
}
