/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProperties, FieldType } from '../../../../common/dynamic_config/types';

export type ConnectorConfigEntry = ConfigProperties & { key: string };

export const validIntInput = (value: string | number | boolean | null): boolean => {
  // reject non integers (including x.0 floats), but don't validate if empty
  return (value !== null || value !== '') &&
    (isNaN(Number(value)) ||
      !Number.isSafeInteger(Number(value)) ||
      ensureStringType(value).indexOf('.') >= 0)
    ? false
    : true;
};

export const ensureCorrectTyping = (
  type: FieldType,
  value: string | number | boolean | null
): string | number | boolean | null => {
  switch (type) {
    case FieldType.INTEGER:
      return validIntInput(value) ? ensureIntType(value) : value;
    case FieldType.BOOLEAN:
      return ensureBooleanType(value);
    default:
      return ensureStringType(value);
  }
};

export const ensureStringType = (value: string | number | boolean | null): string => {
  return value !== null ? String(value) : '';
};

export const ensureIntType = (value: string | number | boolean | null): number | null => {
  // int is null-safe to prevent empty values from becoming zeroes
  if (value === null || value === '') {
    return null;
  }

  return parseInt(String(value), 10);
};

export const ensureBooleanType = (value: string | number | boolean | null): boolean => {
  return Boolean(value);
};

export const hasUiRestrictions = (configEntry: Partial<ConnectorConfigEntry>) => {
  return (configEntry.ui_restrictions ?? []).length > 0;
};
