/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { isPopulatedObject } from './object_utils';
import { RUNTIME_FIELD_TYPES } from '../../../../../src/plugins/data/common';
import type { RuntimeMappings } from '../types/fields';

type RuntimeType = typeof RUNTIME_FIELD_TYPES[number];

export function isRuntimeField(arg: unknown): arg is estypes.MappingRuntimeField {
  return (
    ((isPopulatedObject(arg, ['type']) && Object.keys(arg).length === 1) ||
      (isPopulatedObject(arg, ['type', 'script']) &&
        Object.keys(arg).length === 2 &&
        (typeof arg.script === 'string' ||
          (isPopulatedObject(arg.script, ['source']) &&
            Object.keys(arg.script).length === 1 &&
            typeof arg.script.source === 'string')))) &&
    RUNTIME_FIELD_TYPES.includes(arg.type as RuntimeType)
  );
}

export function isRuntimeMappings(arg: unknown): arg is RuntimeMappings {
  return isPopulatedObject(arg) && Object.values(arg).every((d) => isRuntimeField(d));
}
