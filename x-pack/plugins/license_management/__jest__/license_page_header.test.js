/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicensePageHeader } from '../public/application/sections/license_dashboard/license_page_header';
import { createMockLicense, getComponent } from './util';

describe('LicenseStatus component', () => {
  test('should display normally when license is active', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold'),
      },
      LicensePageHeader
    );
    expect(rendered.render()).toMatchSnapshot();
  });
  test('should display display warning is expired', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0),
      },
      LicensePageHeader
    );
    expect(rendered.render()).toMatchSnapshot();
  });
});
