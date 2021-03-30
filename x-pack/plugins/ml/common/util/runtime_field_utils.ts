/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from './object_utils';
import {
  RUNTIME_FIELD_TYPES,
  RuntimeType,
} from '../../../../../src/plugins/data/common/index_patterns';
import type { RuntimeField, RuntimeMappings } from '../types/fields';

export function isRuntimeField(arg: unknown): arg is RuntimeField {
  return (
    isPopulatedObject(arg) &&
    ((Object.keys(arg).length === 1 && arg.hasOwnProperty('type')) ||
      (Object.keys(arg).length === 2 &&
        arg.hasOwnProperty('type') &&
        arg.hasOwnProperty('script') &&
        (typeof arg.script === 'string' ||
          (isPopulatedObject(arg.script) &&
            Object.keys(arg.script).length === 1 &&
            arg.script.hasOwnProperty('source') &&
            typeof arg.script.source === 'string')))) &&
    RUNTIME_FIELD_TYPES.includes(arg.type as RuntimeType)
  );
}

export function isRuntimeMappings(arg: unknown): arg is RuntimeMappings {
  return isPopulatedObject(arg) && Object.values(arg).every((d) => isRuntimeField(d));
}
