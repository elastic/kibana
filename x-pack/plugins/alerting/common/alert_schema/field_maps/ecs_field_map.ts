/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@kbn/ecs';

export interface AllowedValue {
  description?: string;
  name?: string;
}

export interface MultiField {
  flat_name: string;
  name: string;
  type: string;
}

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name: string;
  description: string;
  doc_values?: boolean;
  example?: string | number | boolean;
  flat_name: string;
  ignore_above?: number;
  index?: boolean;
  level: string;
  multi_fields?: MultiField[];
  name: string;
  normalize: string[];
  required?: boolean;
  scaling_factor?: number;
  short: string;
  type: string;
}

export const ecsFieldMap = Object.keys(EcsFlat).reduce((acc, currKey) => {
  const value: EcsMetadata = EcsFlat[currKey as keyof typeof EcsFlat];
  return {
    ...acc,
    [currKey]: {
      type: value.type,
      array: value.normalize.includes('array'),
      required: !!value.required,
      ...(value.scaling_factor ? { scaling_factor: value.scaling_factor } : {}),
      ...(value.ignore_above ? { ignore_above: value.ignore_above } : {}),
      ...(value.multi_fields ? { multi_fields: value.multi_fields } : {}),
      ...(value.doc_values != null ? { doc_values: value.doc_values } : {}),
      ...(value.index != null ? { index: value.index } : {}),
    },
  };
}, {});

export type EcsFieldMap = typeof ecsFieldMap;
