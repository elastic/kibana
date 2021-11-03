/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicenseState } from '../lib/license_state';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

export interface SecurityHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export const getSecurityHealth = async (
  licenseState: ILicenseState | null,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  areApiKeysEnabled: () => Promise<boolean>
) => {
  const isEsSecurityEnabled: boolean | null = licenseState
    ? licenseState.getIsSecurityEnabled()
    : null;
  const apiKeysAreEnabled = await areApiKeysEnabled();

  let isSufficientlySecure: boolean;

  if (isEsSecurityEnabled === null) {
    isSufficientlySecure = false;
  } else {
    // if isEsSecurityEnabled = true, then areApiKeysEnabled must be true to enable alerting
    // if isEsSecurityEnabled = false, then it does not matter what areApiKeysEnabled is
    isSufficientlySecure = !isEsSecurityEnabled || (isEsSecurityEnabled && apiKeysAreEnabled);
  }

  const securityHealth: SecurityHealth = {
    isSufficientlySecure,
    hasPermanentEncryptionKey: encryptedSavedObjects.canEncrypt,
  };

  return securityHealth;
};
