/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseStatus } from '../public/application/sections/license_dashboard/license_status';
import { createMockLicense, getComponent } from './util';

describe('LicenseStatus component', () => {
  test('should display normally when license is active', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
      },
      LicenseStatus
    );
    expect(rendered.html()).toMatchSnapshot();
  });
  test('should display display warning is expired', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0),
      },
      LicenseStatus
    );
    expect(rendered.html()).toMatchSnapshot();
  });
});
