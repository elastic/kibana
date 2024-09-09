/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import type { CamelCasedPropertiesDeep, SnakeCasedPropertiesDeep } from 'type-fest';

export const convertObjectKeysToCamelCase = <T extends Record<string, unknown>>(
  obj: T | undefined
) => {
  if (obj == null) {
    return obj;
  }
  return camelcaseKeys(obj, { deep: true }) as unknown as CamelCasedPropertiesDeep<T>;
};

export const convertObjectKeysToSnakeCase = <T extends Record<string, unknown>>(
  obj: T | undefined
) => {
  if (obj == null) {
    return obj;
  }
  return snakecaseKeys(obj, { deep: true }) as SnakeCasedPropertiesDeep<T>;
};
