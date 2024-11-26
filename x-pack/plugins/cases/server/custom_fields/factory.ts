/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../common/types/domain';
import type { ICasesCustomField, CasesCustomFieldsMap } from './types';
import { getCasesTextCustomField } from './text';
import { getCasesToggleCustomField } from './toggle';
import { getCasesNumberCustomField } from './number';

const mapping: Record<CustomFieldTypes, ICasesCustomField> = {
  [CustomFieldTypes.TEXT]: getCasesTextCustomField(),
  [CustomFieldTypes.TOGGLE]: getCasesToggleCustomField(),
  [CustomFieldTypes.NUMBER]: getCasesNumberCustomField(),
};

export const casesCustomFields: CasesCustomFieldsMap = {
  get: (type: CustomFieldTypes): ICasesCustomField | null => mapping[type] ?? null,
};
