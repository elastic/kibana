/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensingMock } from '../../../licensing/server/mocks';
import { SecurityLicenseService } from './license_service';

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
    const mockRawLicense = licensingMock.createLicenseMock();
    mockRawLicense.isAvailable = false;
    serviceSetup.update(mockRawLicense);
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
    const mockRawLicense = licensingMock.createLicenseMock();
    mockRawLicense.hasAtLeast.mockReturnValue(false);
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
    const mockRawLicense = licensingMock.createLicenseMock();
    mockRawLicense.hasAtLeast.mockReturnValue(false);
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
    const mockRawLicense = licensingMock.createLicenseMock();
    mockRawLicense.hasAtLeast.mockImplementation(license => {
      return license === 'trial' || license === 'platinum' || license === 'enterprise';
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
