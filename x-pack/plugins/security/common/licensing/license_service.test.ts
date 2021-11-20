/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';

import { licenseMock } from '../../../licensing/common/licensing.mock';
import { SecurityLicenseService } from './license_service';

describe('license features', function () {
  it('should display error when ES is unavailable', () => {
    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(undefined as any),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(false);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowAccessAgreement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-es-unavailable',
      allowRbac: false,
      allowSubFeaturePrivileges: false,
      allowAuditLogging: false,
    });
  });

  it('should display error when X-Pack is unavailable', () => {
    const rawLicenseMock = licenseMock.createLicenseMock();
    rawLicenseMock.isAvailable = false;
    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(rawLicenseMock),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(false);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowAccessAgreement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-xpack-unavailable',
      allowRbac: false,
      allowSubFeaturePrivileges: false,
      allowAuditLogging: false,
    });
  });

  it('should notify consumers of licensed feature changes', () => {
    const rawLicenseMock = licenseMock.createLicenseMock();
    rawLicenseMock.isAvailable = false;
    const rawLicense$ = new BehaviorSubject(rawLicenseMock);
    const serviceSetup = new SecurityLicenseService().setup({
      license$: rawLicense$,
    });

    const subscriptionHandler = jest.fn();
    const subscription = serviceSetup.license.features$.subscribe(subscriptionHandler);
    try {
      expect(serviceSetup.license.isLicenseAvailable()).toEqual(false);
      expect(subscriptionHandler).toHaveBeenCalledTimes(1);
      expect(subscriptionHandler.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "allowAccessAgreement": false,
            "allowAuditLogging": false,
            "allowLogin": false,
            "allowRbac": false,
            "allowRoleDocumentLevelSecurity": false,
            "allowRoleFieldLevelSecurity": false,
            "allowSubFeaturePrivileges": false,
            "layout": "error-xpack-unavailable",
            "showLinks": false,
            "showLogin": true,
            "showRoleMappingsManagement": false,
          },
        ]
      `);

      rawLicense$.next(licenseMock.createLicenseMock());
      expect(serviceSetup.license.isLicenseAvailable()).toEqual(true);
      expect(subscriptionHandler).toHaveBeenCalledTimes(2);
      expect(subscriptionHandler.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "allowAccessAgreement": true,
            "allowAuditLogging": true,
            "allowLogin": true,
            "allowRbac": true,
            "allowRoleDocumentLevelSecurity": true,
            "allowRoleFieldLevelSecurity": true,
            "allowSubFeaturePrivileges": true,
            "showLinks": true,
            "showLogin": true,
            "showRoleMappingsManagement": true,
          },
        ]
      `);
    } finally {
      subscription.unsubscribe();
    }
  });

  it('should show login page and other security elements, allow RBAC but forbid paid features if license is basic.', () => {
    const mockRawLicense = licenseMock.createLicense({
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const getFeatureSpy = jest.spyOn(mockRawLicense, 'getFeature');

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(true);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: false,
      allowAccessAgreement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
      allowSubFeaturePrivileges: false,
      allowAuditLogging: false,
    });
    expect(getFeatureSpy).toHaveBeenCalledTimes(1);
    expect(getFeatureSpy).toHaveBeenCalledWith('security');
  });

  it('should not show login page or other security elements if security is disabled in Elasticsearch.', () => {
    const mockRawLicense = licenseMock.createLicense({
      features: { security: { isEnabled: false, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(true);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowAccessAgreement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      allowSubFeaturePrivileges: false,
      allowAuditLogging: false,
    });
  });

  it('should allow role mappings, access agreement, sub-feature privileges and audit logging, but not DLS/FLS if license = gold', () => {
    const mockRawLicense = licenseMock.createLicense({
      license: { mode: 'gold', type: 'gold' },
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(true);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowAccessAgreement: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
      allowSubFeaturePrivileges: true,
      allowAuditLogging: true,
    });
  });

  it('should allow to login, allow RBAC, role mappings, access agreement, sub-feature privileges, and DLS if license >= platinum', () => {
    const mockRawLicense = licenseMock.createLicense({
      license: { mode: 'platinum', type: 'platinum' },
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.isLicenseAvailable()).toEqual(true);
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowAccessAgreement: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowRbac: true,
      allowSubFeaturePrivileges: true,
      allowAuditLogging: true,
    });
  });
});
