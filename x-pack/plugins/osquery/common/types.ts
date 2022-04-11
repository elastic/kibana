/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy, PackagePolicyInput, PackagePolicyInputStream } from '../../fleet/common';

export const savedQuerySavedObjectType = 'osquery-saved-query';
export const packSavedObjectType = 'osquery-pack';
export const packAssetSavedObjectType = 'osquery-pack-asset';
export const usageMetricSavedObjectType = 'osquery-manager-usage-metric';
export type SavedObjectType =
  | 'osquery-saved-query'
  | 'osquery-pack'
  | 'osquery-manager-usage-metric';

/**
 * This makes any optional property the same as Required<T> would but also has the
 * added benefit of keeping your undefined.
 *
 * For example:
 * type A = RequiredKeepUndefined<{ a?: undefined; b: number }>;
 *
 * will yield a type of:
 * type A = { a: undefined; b: number; }
 *
 */
export type RequiredKeepUndefined<T> = { [K in keyof T]-?: [T[K]] } extends infer U
  ? U extends Record<keyof U, [unknown]>
    ? { [K in keyof U]: U[K][0] }
    : never
  : never;

export interface OsqueryManagerPackagePolicyConfigRecordEntry {
  type: string;
  value: string;
  frozen?: boolean;
}

export interface OsqueryManagerPackagePolicyConfigRecord {
  id: OsqueryManagerPackagePolicyConfigRecordEntry;
  query: OsqueryManagerPackagePolicyConfigRecordEntry;
  interval: OsqueryManagerPackagePolicyConfigRecordEntry;
  platform?: OsqueryManagerPackagePolicyConfigRecordEntry;
  version?: OsqueryManagerPackagePolicyConfigRecordEntry;
  ecs_mapping?:
    | {
        value: Record<
          string,
          {
            field: string;
          }
        >;
      }
    | undefined;
}

export interface OsqueryManagerPackagePolicyInputStream
  extends Omit<PackagePolicyInputStream, 'config' | 'vars'> {
  config?: OsqueryManagerPackagePolicyConfigRecord;
  vars?: OsqueryManagerPackagePolicyConfigRecord;
}

export interface OsqueryManagerPackagePolicyInput extends Omit<PackagePolicyInput, 'streams'> {
  streams: OsqueryManagerPackagePolicyInputStream[];
}

export interface OsqueryManagerPackagePolicy extends Omit<PackagePolicy, 'inputs'> {
  inputs: OsqueryManagerPackagePolicyInput[];
  read_only?: boolean;
}
