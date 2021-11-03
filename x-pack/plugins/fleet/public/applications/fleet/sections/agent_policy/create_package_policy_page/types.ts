/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EditPackagePolicyFrom =
  | 'package'
  | 'package-edit'
  | 'policy'
  | 'edit'
  | 'upgrade-from-fleet-policy-list'
  | 'upgrade-from-integrations-policy-list'
  | 'upgrade-from-extension';

export type PackagePolicyFormState =
  | 'VALID'
  | 'INVALID'
  | 'CONFIRM'
  | 'LOADING'
  | 'SUBMITTED'
  | 'SUBMITTED_NO_AGENTS';
