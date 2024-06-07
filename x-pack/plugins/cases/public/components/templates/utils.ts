/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { getConnectorsFormSerializer } from '../utils';
import type { TemplateFormProps } from './types';

export function removeEmptyFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, value]) => !isEmpty(value) || typeof value === 'boolean')
      .map(([key, value]) => [
        key,
        value === Object(value) && !Array.isArray(value)
          ? removeEmptyFields(value as Record<string, unknown>)
          : value,
      ])
  ) as T;
}

export const templateSerializer = (data: TemplateFormProps): TemplateFormProps => {
  if (data !== null) {
    const { fields = null, ...rest } = data;
    const connectorFields = getConnectorsFormSerializer({ fields });
    const serializedFields = removeEmptyFields({ ...rest });

    return {
      ...serializedFields,
      fields: connectorFields.fields,
    } as TemplateFormProps;
  }

  return data;
};
