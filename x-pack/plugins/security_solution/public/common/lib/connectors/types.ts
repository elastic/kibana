/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../../../../../triggers_actions_ui/public';

import {
  ActionType as ThirdPartySupportedActions,
  CaseField,
} from '../../../../../case/common/api';

export { ThirdPartyField as AllThirdPartyFields } from '../../../../../case/common/api';

export interface ThirdPartyField {
  label: string;
  validSourceFields: CaseField[];
  defaultSourceField: CaseField;
  defaultActionType: ThirdPartySupportedActions;
}

export interface ConnectorConfiguration extends ActionType {
  logo: string;
  fields: Record<string, ThirdPartyField>;
}
