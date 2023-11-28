/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { ManagementAppLocatorDefinition } from '@kbn/management-plugin/common/locator';
import { LicenseManagementLocatorDefinition, LICENSE_MANAGEMENT_LOCATOR_ID } from './locator';
describe('License Management URL locator', () => {
  let locator: LicenseManagementLocatorDefinition;
  beforeEach(() => {
    const managementDefinition = new ManagementAppLocatorDefinition();
    locator = new LicenseManagementLocatorDefinition({
      managementAppLocator: {
        ...sharePluginMock.createLocator(),
        getLocation: (params) => managementDefinition.getLocation(params),
      },
    });
  });
  test('locator has the right ID', () => {
    expect(locator.id).toBe(LICENSE_MANAGEMENT_LOCATOR_ID);
  });

  test('locator returns the correct url for dashboard page', async () => {
    const { path } = await locator.getLocation({ page: 'dashboard' });
    expect(path).toBe('/stack/license_management');
  });
  test('locator returns the correct url for upload license page', async () => {
    const { path } = await locator.getLocation({ page: 'upload_license' });
    expect(path).toBe('/stack/license_management/upload_license');
  });
});
