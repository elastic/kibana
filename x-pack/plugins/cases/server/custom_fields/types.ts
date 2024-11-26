/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldTypes, CustomFieldValue } from '../../common/types/domain';

export enum CasesCustomFieldMappingType {
  TEXT = 'text',
  LONG = 'long',
  BOOLEAN = 'boolean',
  LIST_OPTION = 'list-option',
}

export interface ICasesCustomField {
  isFilterable: boolean;
  isSortable: boolean;
  savedObjectMappingType: CasesCustomFieldMappingType;
  validateFilteringValues: (values: CustomFieldValue[]) => void;
  getDefaultValue?: () => CustomFieldValue;
}

export interface CasesCustomFieldsMap {
  get: (type: CustomFieldTypes) => ICasesCustomField | null;
}
