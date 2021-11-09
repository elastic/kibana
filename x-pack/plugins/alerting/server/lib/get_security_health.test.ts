/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '../../../licensing/server/mocks';
import { LicenseState, ILicenseState } from './license_state';
import { BehaviorSubject } from 'rxjs';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { getSecurityHealth } from './get_security_health';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';

const createDependencies = (
  isSecurityEnabled: boolean | null,
  canEncrypt: boolean,
  apiKeysEnabled: boolean
) => {
  const getLicenseState = (_isSecurityEnabled: boolean | null) => {
    if (_isSecurityEnabled === null) return null;

    const licenseMock = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
      features: {
        security: {
          isEnabled: _isSecurityEnabled,
          isAvailable: _isSecurityEnabled,
        },
      },
    });

    return new LicenseState(new BehaviorSubject(licenseMock));
  };

  const licenseState = getLicenseState(isSecurityEnabled);

  const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt });

  const areApikeysEnabled = async () => apiKeysEnabled;

  const deps: [ILicenseState | null, EncryptedSavedObjectsPluginSetup, () => Promise<boolean>] = [
    licenseState,
    encryptedSavedObjects,
    areApikeysEnabled,
  ];

  return deps;
};

describe('Get security health', () => {
  describe('Correctly returns the overall security health', () => {
    test('When ES security enabled status cannot be determined', async () => {
      const deps = createDependencies(null, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is disabled', async () => {
      const deps = createDependencies(false, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is enabled, and API keys are disabled', async () => {
      const deps = createDependencies(true, true, false);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
      });
    });

    test('When ES security is enabled, and API keys are enabled', async () => {
      const deps = createDependencies(true, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('With encryption enabled', async () => {
      const deps = createDependencies(true, true, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: true,
      });
    });

    test('With encryption disabled', async () => {
      const deps = createDependencies(true, false, true);
      const securityHealth = await getSecurityHealth(...deps);
      expect(securityHealth).toEqual({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: false,
      });
    });
  });
});
