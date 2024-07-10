/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import * as rt from 'io-ts';
import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/lib/Either';

import { FieldConfig, ValidationFunc, fieldValidators } from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

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
  /**
   * Useful when deserializing strings that will be rendered inside of text areas or text inputs. We want
   * a string like: "my\ttab" to render the same, not to render as "my<tab>tab".
   */
  escapeBackslashes: (v: unknown) => {
    if (typeof v === 'string') {
      const s = JSON.stringify(v);
      return s.slice(1, s.length - 1);
    }
    return v;
  },
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
    return undefined;
  },
  optionalArrayOfStrings: (v: string[]) => (v.length ? v : undefined),
  undefinedIfValue: (value: unknown) => (v: boolean) => (v === value ? undefined : v),
  emptyStringToUndefined: (v: unknown) => (v === '' ? undefined : v),
  /**
   * Useful when serializing user input from a <textarea /> that we want to later JSON.stringify but keep the same as what
   * the user input. For instance, given "my\ttab", encoded as "my%5Ctab" will JSON.stringify to "my\\ttab", instead we want
   * to keep the input exactly as the user entered it.
   */
  unescapeBackslashes: (v: unknown) => {
    if (typeof v === 'string') {
      try {
        return JSON.parse(`"${v}"`);
      } catch (e) {
        // Best effort
        return v;
      }
    }
  },
};

const isJSONString = (v: string) => {
  try {
    JSON.parse(`"${v}"`);
    return true;
  } catch (e) {
    return false;
  }
};

export const isJSONStringValidator: ValidationFunc = ({ value }) => {
  if (typeof value !== 'string' || !isJSONString(value)) {
    return {
      message: i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.jsonStringField.invalidStringMessage',
        { defaultMessage: 'Invalid JSON string.' }
      ),
    };
  }
};

/**
 * Similar to the emptyField validator but we accept whitespace characters.
 */
export const isEmptyString =
  (message: string): ValidationFunc =>
  (field) => {
    const { value } = field;
    if (typeof value === 'string') {
      const hasLength = Boolean(value.length);
      const hasNonWhiteSpaceChars = hasLength && Boolean(value.trim().length);
      if (hasNonWhiteSpaceChars) {
        return emptyField(message)(field);
      }
    }
  };

export const EDITOR_PX_HEIGHT = {
  extraSmall: 75,
  small: 100,
  medium: 200,
  large: 300,
};

export type FieldsConfig = Record<string, FieldConfig<any>>;

export type FormFieldsComponent = FunctionComponent<{
  initialFieldValues?: Record<string, any>;
}>;
