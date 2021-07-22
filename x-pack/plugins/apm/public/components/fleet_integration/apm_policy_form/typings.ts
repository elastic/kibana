/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicyConfigRecordEntry } from '../../../../../fleet/common';

export {
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../../../fleet/public';

export {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';

export type PackagePolicyValues = Record<
  string,
  PackagePolicyConfigRecordEntry
>;

export type OnFormChangeFn = (
  newValues: PackagePolicyValues,
  isValid: boolean
) => void;
