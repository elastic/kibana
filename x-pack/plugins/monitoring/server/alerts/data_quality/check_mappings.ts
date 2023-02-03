/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@kbn/ecs';
import { Mappings } from './fetch_mappings';
import { getFieldsWithTypes } from './field_types';
import { EcsFlatLike } from './types';

export interface FieldWithInvalidType {
  field: string;
  currentType: string;
  correctType: string;
  index: string;
}

export const checkMappings = (mappings: Mappings, index: string): FieldWithInvalidType[] => {
  const properties = mappings[index]?.mappings?.properties;

  if (!properties) {
    return [];
  }

  const fields = getFieldsWithTypes(properties);

  // cast ecs flat to record
  return fields
    .filter((field) => (EcsFlat as EcsFlatLike)[field.field]?.type !== field.type)
    .map((field) => ({
      field: field.field,
      currentType: field.type,
      correctType: (EcsFlat as EcsFlatLike)[field.field]!.type,
      index,
    }));
};
