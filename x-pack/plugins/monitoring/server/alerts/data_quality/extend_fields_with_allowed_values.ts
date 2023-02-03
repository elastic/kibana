/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@kbn/ecs';
import type { FieldType } from './field_types';
import { AllowedValues, EcsFlatLike } from './types';

const schema: EcsFlatLike = EcsFlat;

export type FieldTypeWithAllowedValues = FieldType & {
  allowedValues?: AllowedValues[];
};

/**
 * Adds allowed fields information to field type
 */
export const extendFieldsWithAllowedValues = (
  fieldsTypes: FieldType[]
): FieldTypeWithAllowedValues[] => {
  return fieldsTypes
    .map((field) => {
      const allowedValues = schema[field.field]?.allowed_values as AllowedValues[];

      return {
        ...field,
        allowedValues,
      };
    })
    .filter((field) => field.allowedValues);
};
