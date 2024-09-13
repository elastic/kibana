/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import type { CaseAssignees, CaseCustomFields } from '../../../common/types/domain';
import { CaseAssigneesRt, CaseCustomFieldsRt } from '../../../common/types/domain';

export const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((val) => isString(val));
};

export const isAssigneesArray = (value: unknown): value is CaseAssignees => {
  return CaseAssigneesRt.is(value);
};

export const isCustomFieldsArray = (value: unknown): value is CaseCustomFields => {
  return CaseCustomFieldsRt.is(value);
};
