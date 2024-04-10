/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { ProtectionModes, AntivirusRegistrationModes } from '../types';

export const updateAntivirusRegistrationEnabledInPlace = (policy: PolicyConfig): PolicyConfig => {
  const modeToEnabled: Record<AntivirusRegistrationModes, boolean> = {
    [AntivirusRegistrationModes.enabled]: true,
    [AntivirusRegistrationModes.disabled]: false,
    [AntivirusRegistrationModes.sync]: policy.windows.malware.mode === ProtectionModes.prevent,
  };

  const antivirusRegistrationMode = policy.windows.antivirus_registration.mode;

  policy.windows.antivirus_registration.enabled = modeToEnabled[antivirusRegistrationMode] ?? false;

  return policy;
};
