/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { ProtectionModes, AntivirusRegistrationModes } from '../types';

/** Calculates and updates Antivirus Registration `enabled` state based on the `mode` set by user
 * and by malware protection level in case antivirus registration mode is set to sync with malware.
 *
 * It updates the input parameter in place, i.e. mutates it.
 *
 * @param policy
 */
export const updateAntivirusRegistrationEnabled = (policy: PolicyConfig) => {
  const modeToEnabled: Record<AntivirusRegistrationModes, boolean> = {
    [AntivirusRegistrationModes.enabled]: true,
    [AntivirusRegistrationModes.disabled]: false,
    [AntivirusRegistrationModes.sync]: policy.windows.malware.mode === ProtectionModes.prevent,
  };

  const antivirusRegistrationMode = policy.windows.antivirus_registration.mode;

  if (antivirusRegistrationMode) {
    // calculate only if `mode` exists
    policy.windows.antivirus_registration.enabled =
      modeToEnabled[antivirusRegistrationMode] ?? false;
  }
};
