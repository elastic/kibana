/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FunctionComponent } from 'react';
import * as rt from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

import { FieldConfig } from '../../../../../../shared_imports';

export const arrayOfStrings = rt.array(rt.string);

export function isArrayOfStrings(v: unknown): v is string[] {
  const res = arrayOfStrings.decode(v);
  return isRight(res);
}

/**
 * Shared deserializer functions.
 *
 * These are intended to be used in @link{FieldsConfig} as the "deserializer".
 *
 * Example:
 * {
 *   ...
 *   deserialize: to.booleanOrUndef,
 *   ...
 * }
 *
 */
export const to = {
  booleanOrUndef: (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined),
  arrayOfStrings: (v: unknown): string[] =>
    isArrayOfStrings(v) ? v : typeof v === 'string' && v.length ? [v] : [],
  jsonString: (v: unknown) => (v ? JSON.stringify(v, null, 2) : '{}'),
};

/**
 * Shared serializer functions.
 *
 * These are intended to be used in @link{FieldsConfig} as the "serializer".
 *
 * Example:
 * {
 *   ...
 *   serializer: from.optionalJson,
 *   ...
 * }
 *
 */
export const from = {
  /* Works with `to.jsonString` as deserializer. */
  optionalJson: (v: string) => {
    if (v) {
      try {
        const json = JSON.parse(v);
        if (Object.keys(json).length) {
          return json;
        }
      } catch (e) {
        // Ignore
      }
    }
  },
  optionalArrayOfStrings: (v: string[]) => (v.length ? v : undefined),
  undefinedIfValue: (value: any) => (v: boolean) => (v === value ? undefined : v),
};

export const EDITOR_PX_HEIGHT = {
  extraSmall: 75,
  small: 100,
  medium: 200,
  large: 300,
};

export type FieldsConfig = Record<string, FieldConfig<any>>;

export type FormFieldsComponent = FunctionComponent<{ initialFieldValues?: Record<string, any> }>;
