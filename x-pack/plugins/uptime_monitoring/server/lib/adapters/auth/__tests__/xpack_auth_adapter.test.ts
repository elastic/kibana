/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMXPackAuthAdapter } from '../xpack_auth_adapter';

describe('X-PackAuthAdapter class', () => {
  let xpack: any;
  beforeEach(() => {
    xpack = {
      info: {
        license: {
          isActive: true,
          type: 'platinum',
        },
      },
    };
  });

  it('returns the license type', () => {
    const adapter = new UMXPackAuthAdapter(xpack);
    expect(adapter.getLicenseType()).toBe('platinum');
    expect(adapter.licenseIsActive()).toBe(true);
  });

  it('returns null if no license defined', () => {
    xpack = {
      info: {
        license: {
          isActive: false,
        },
      },
    };
    const adapter = new UMXPackAuthAdapter(xpack);
    expect(adapter.getLicenseType()).toBeNull();
    expect(adapter.licenseIsActive()).toBe(false);
  });
});
