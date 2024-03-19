/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomFieldTypes } from '@kbn/cases-common-types';

export interface ICasesCustomField {
  isFilterable: boolean;
  isSortable: boolean;
  savedObjectMappingType: string;
  validateFilteringValues: (values: Array<string | number | boolean | null>) => void;
}

export interface CasesCustomFieldsMap {
  get: (type: CustomFieldTypes) => ICasesCustomField | null;
}
