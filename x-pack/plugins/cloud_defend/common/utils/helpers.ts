/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Truthy } from 'lodash';
import { INTEGRATION_PACKAGE_NAME } from '../constants';

/**
 * @example
 * declare const foo: Array<string | undefined | null>
 * foo.filter(isNonNullable) // foo is Array<string>
 */
export const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

export const truthy = <T>(value: T): value is Truthy<T> => !!value;

export const extractErrorMessage = (e: unknown, defaultMessage = 'Unknown Error'): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;

  return defaultMessage; // TODO: i18n
};

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export const isCloudDefendPackage = (packageName?: string) =>
  packageName === INTEGRATION_PACKAGE_NAME;
