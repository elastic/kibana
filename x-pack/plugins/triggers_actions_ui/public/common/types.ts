/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

type KbnFieldTypesString = Lowercase<keyof typeof KBN_FIELD_TYPES>;

export interface AggregationType {
  text: string;
  fieldRequired: boolean;
  value: string;
  validNormalizedTypes: KbnFieldTypesString[];
}

export interface GroupByType {
  text: string;
  sizeRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}

export interface FieldOption {
  name: string;
  type: string;
  normalizedType: string;
  searchable: boolean;
  aggregatable: boolean;
}

export type { RuleStatus } from '../types';
