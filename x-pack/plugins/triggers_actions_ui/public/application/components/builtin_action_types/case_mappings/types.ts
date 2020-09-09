/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../../../../types';

export { ActionType };

export interface ThirdPartyField {
  label: string;
  validSourceFields: string[];
  defaultSourceField: string;
  defaultActionType: string;
}
export interface CasesConfigurationMapping {
  source: string;
  target: string;
  actionType: string;
}
