/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMAuthContainer, UMXPackLicenseInfo } from '../adapter_types';
import { UMXPackAuthAdapter } from '../xpack_auth_adapter';

describe('X-PackAuthAdapter class', () => {
  let xpack: UMAuthContainer;
  const setupXPack = (licenseInfo: UMXPackLicenseInfo) => {
    xpack = {
      info: {
        feature: (pluginId: string) => ({
          registerLicenseCheckResultsGenerator: (
            licenseCheckResultsHandler: (info: UMXPackLicenseInfo) => void
          ) => {
            licenseCheckResultsHandler(licenseInfo);
          },
        }),
      },
      status: {
        once: (status: string, registerLicenseCheck: () => void) => {
          registerLicenseCheck();
        },
      },
    };
  };
  beforeEach(() => {
    setupXPack({
      license: {
        isActive: () => true,
        getType: () => 'platinum',
      },
    });
  });

  it('returns the license type', () => {
    const adapter = new UMXPackAuthAdapter(xpack);
    expect(adapter.getLicenseType()).toBe('platinum');
    expect(adapter.licenseIsActive()).toBe(true);
  });

  it('returns null and false for undefined license values', () => {
    setupXPack({
      license: {
        getType: () => undefined,
        isActive: () => undefined,
      },
    });
    const adapter = new UMXPackAuthAdapter(xpack);
    expect(adapter.licenseIsActive()).toBe(false);
    expect(adapter.getLicenseType()).toBeNull();
  });
});
