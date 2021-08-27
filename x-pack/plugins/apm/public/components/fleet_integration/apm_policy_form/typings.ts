/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackagePolicyConfigRecordEntry } from '../../../../../fleet/common/types/models/package_policy';

export type {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';
export type {
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../../../fleet/public';

export type PackagePolicyVars = Record<string, PackagePolicyConfigRecordEntry>;

export type OnFormChangeFn = (
  newVars: PackagePolicyVars,
  isValid: boolean
) => void;
