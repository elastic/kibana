/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SelectOption {
  label: string;
  value: string;
  icon?: string;
}

export interface Dependency {
  field: string;
  value: string | number | boolean | null;
}

export enum FieldType {
  STRING = 'str',
  INTEGER = 'int',
  LIST = 'list',
  BOOLEAN = 'bool',
}

export interface ConfigCategoryProperties {
  label: string;
  order: number;
  type: 'category';
}

export interface Validation {
  constraint: string | number;
  type: string;
}

export interface ConfigProperties {
  category?: string;
  default_value: string | number | boolean | null;
  label: string;
  order?: number | null;
  required: boolean;
  sensitive: boolean;
  description: string | null;
  type: FieldType;
  validations: Validation[];
  value: string | number | boolean | null;
}

interface ConfigEntry extends ConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  isValid: boolean;
  validationErrors: string[];
}
