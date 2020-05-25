/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { SavedObject, SavedObjectAttributes, SavedObjectsFindResponse } from 'kibana/server';
import { RuleAlertAction } from '../../../../common/detection_engine/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleActionsAttributes extends Record<string, any> {
  ruleAlertId: string;
  actions: RuleAlertAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}

export interface RuleActions {
  id: string;
  actions: RuleAlertAction[];
  ruleThrottle: string;
  alertThrottle: string | null;
}

export interface IRuleActionsAttributesSavedObjectAttributes
  extends IRuleActionsAttributes,
    SavedObjectAttributes {}

export interface RuleActionsResponse {
  [key: string]: {
    actions: IRuleActionsAttributes | null | undefined;
  };
}

export interface IRuleActionsSavedObject {
  type: string;
  id: string;
  attributes: Array<SavedObject<IRuleActionsAttributes & SavedObjectAttributes>>;
  references: unknown[];
  updated_at: string;
  version: string;
}

export interface IRuleActionsFindType {
  page: number;
  per_page: number;
  total: number;
  saved_objects: IRuleActionsSavedObject[];
}

export const isRuleActionsSavedObjectType = (
  obj: unknown
): obj is SavedObject<IRuleActionsAttributesSavedObjectAttributes> => {
  return get('attributes', obj) != null;
};

export const isRuleActionsFindType = (
  obj: unknown
): obj is SavedObjectsFindResponse<IRuleActionsAttributesSavedObjectAttributes> => {
  return get('saved_objects', obj) != null;
};

export const isRuleActionsFindTypes = (
  obj: unknown[] | undefined
): obj is Array<SavedObjectsFindResponse<IRuleActionsAttributesSavedObjectAttributes>> => {
  return obj ? obj.every((ruleStatus) => isRuleActionsFindType(ruleStatus)) : false;
};
