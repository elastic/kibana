/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldTypes, CustomFieldValue } from '../../common/types/domain';

export interface ICasesCustomField {
  isFilterable: boolean;
  isSortable: boolean;
  savedObjectMappingType: string;
  validateFilteringValues: (values: CustomFieldValue[]) => void;
  getDefaultValue?: () => CustomFieldValue[];
}

export interface CasesCustomFieldsMap {
  get: (type: CustomFieldTypes) => ICasesCustomField | null;
}
