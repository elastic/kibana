/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Truthy } from 'lodash';
import { NewPackagePolicyInput, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../constants';

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

export const getBenchmarkTypeFilter = (type: BenchmarkId): string =>
  `${CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.metadata.benchmark.id: "${type}"`;

export const isEnabledBenchmarkInputType = (input: PackagePolicyInput | NewPackagePolicyInput) =>
  !!input.type && input.enabled;

export const isCspPackage = (packageName?: string) =>
  packageName === CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
