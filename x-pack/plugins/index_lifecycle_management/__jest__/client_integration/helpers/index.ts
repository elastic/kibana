/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TestSubjects =
  | 'snapshotPolicyCombobox'
  | 'savePolicyButton'
  | 'customPolicyCallout'
  | 'noPoliciesCallout'
  | 'policiesErrorCallout'
  | 'rolloverSwitch'
  | 'rolloverSettingsRequired'
  | 'hot-selectedMaxSizeStored'
  | 'hot-selectedMaxSizeStoredUnits'
  | 'hot-selectedMaxDocuments'
  | 'hot-selectedMaxAge'
  | 'hot-selectedMaxAgeUnits'
  | 'policyTablePolicyNameLink'
  | 'policyTitle'
  | 'createPolicyButton'
  | 'freezeSwitch'
  | string;
