/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../licensing/server';
import { SecurityLicenseService } from './license_service';

function getMockRawLicense({ isAvailable = false } = {}) {
  return ({
    isAvailable,
    isOneOf: jest.fn(),
    getFeature: jest.fn(),
  } as unknown) as jest.Mocked<ILicense>;
}

describe('license features', function() {
  it('should display error when ES is unavailable', () => {
    const serviceSetup = new SecurityLicenseService().setup();
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-es-unavailable',
      allowRbac: false,
    });
  });

  it('should display error when X-Pack is unavailable', () => {
    const serviceSetup = new SecurityLicenseService().setup();
    serviceSetup.update(getMockRawLicense({ isAvailable: false }));
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-xpack-unavailable',
      allowRbac: false,
    });
  });

  it('should show login page and other security elements, allow RBAC but forbid document level security if license is not platinum or trial.', () => {
    const mockRawLicense = getMockRawLicense({ isAvailable: true });
    mockRawLicense.isOneOf.mockImplementation(licenses =>
      Array.isArray(licenses) ? licenses.includes('basic') : licenses === 'basic'
    );
    mockRawLicense.getFeature.mockReturnValue({ isEnabled: true, isAvailable: true });

    const serviceSetup = new SecurityLicenseService().setup();
    serviceSetup.update(mockRawLicense);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
    });
    expect(mockRawLicense.getFeature).toHaveBeenCalledTimes(1);
    expect(mockRawLicense.getFeature).toHaveBeenCalledWith('security');
  });

  it('should not show login page or other security elements if security is disabled in Elasticsearch.', () => {
    const mockRawLicense = getMockRawLicense({ isAvailable: true });
    mockRawLicense.isOneOf.mockReturnValue(false);
    mockRawLicense.getFeature.mockReturnValue({ isEnabled: false, isAvailable: true });

    const serviceSetup = new SecurityLicenseService().setup();
    serviceSetup.update(mockRawLicense);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
    });
  });

  it('should allow to login, allow RBAC and document level security if license >= platinum', () => {
    const mockRawLicense = getMockRawLicense({ isAvailable: true });
    mockRawLicense.isOneOf.mockImplementation(licenses => {
      const licenseArray = [licenses].flat();
      return (
        licenseArray.includes('trial') ||
        licenseArray.includes('platinum') ||
        licenseArray.includes('enterprise')
      );
    });
    mockRawLicense.getFeature.mockReturnValue({ isEnabled: true, isAvailable: true });

    const serviceSetup = new SecurityLicenseService().setup();
    serviceSetup.update(mockRawLicense);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowRbac: true,
    });
  });
});
