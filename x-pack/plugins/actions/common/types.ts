/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseType } from '../../licensing/common/types';

export interface ActionType {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: LicenseType;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  name: string;
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  isPreconfigured: boolean;
}
