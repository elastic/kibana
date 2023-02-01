/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@kbn/ecs';
import type { FieldType } from './field_types';

const schema: Partial<Record<string, Record<string, unknown>>> = EcsFlat;

/**
 * Adds allowed fields information to field type
 */
export const extendFieldsWithAllowedValues = (fieldsTypes: FieldType[]) => {
  return fieldsTypes
    .map((field) => {
      const allowedValues = schema[field.field]?.allowed_values;

      return {
        ...field,
        allowedValues,
      };
    })
    .filter((field) => field.allowedValues);
};
