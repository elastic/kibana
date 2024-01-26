/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
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
  | 'SUBMITTED_NO_AGENTS'
  | 'SUBMITTED_AZURE_ARM_TEMPLATE'
  | 'SUBMITTED_CLOUD_FORMATION'
  | 'SUBMITTED_GOOGLE_CLOUD_SHELL';

export interface AddToPolicyParams {
  pkgkey: string;
  integration?: string;
  policyId?: string;
}

export type CreatePackagePolicyParams = React.FunctionComponent<{
  from: EditPackagePolicyFrom;
  queryParamsPolicyId?: string;
  prerelease: boolean;
}>;
