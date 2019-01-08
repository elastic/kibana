/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMemoryAuthAdapter } from '../memory_auth_adapter';

describe('MemoryAuthAdapter', () => {
  let xpack: any;
  let adapter: UMMemoryAuthAdapter;

  beforeEach(() => {
    xpack = {
      info: {
        license: {
          isActive: false,
        },
      },
    };
    adapter = new UMMemoryAuthAdapter(xpack);
  });

  it('returns null for missing license field', () => {
    expect(adapter.getLicenseType()).toBeNull();
  });

  it('returns the license type when defined', () => {
    xpack = {
      info: {
        license: {
          type: 'platinum',
          isActive: false,
        },
      },
    };
    adapter = new UMMemoryAuthAdapter(xpack);
    expect(adapter.getLicenseType()).toBe('platinum');
  });

  it('returns the expected license active status', () => {
    expect(adapter.licenseIsActive()).toBe(false);
  });
});
