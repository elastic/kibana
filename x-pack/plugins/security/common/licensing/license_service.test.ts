/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, BehaviorSubject } from 'rxjs';
import { licensingMock } from '../../../licensing/public/mocks';
import { SecurityLicenseService } from './license_service';

describe('license features', function() {
  it('should display error when ES is unavailable', () => {
    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(undefined as any),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-es-unavailable',
      allowRbac: false,
    });
  });

  it('should display error when X-Pack is unavailable', () => {
    const rawLicenseMock = licensingMock.createLicenseMock();
    rawLicenseMock.isAvailable = false;
    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(rawLicenseMock),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      layout: 'error-xpack-unavailable',
      allowRbac: false,
    });
  });

  it('should notify consumers of licensed feature changes', () => {
    const rawLicenseMock = licensingMock.createLicenseMock();
    rawLicenseMock.isAvailable = false;
    const rawLicense$ = new BehaviorSubject(rawLicenseMock);
    const serviceSetup = new SecurityLicenseService().setup({
      license$: rawLicense$,
    });

    const subscriptionHandler = jest.fn();
    const subscription = serviceSetup.license.features$.subscribe(subscriptionHandler);
    try {
      expect(subscriptionHandler).toHaveBeenCalledTimes(1);
      expect(subscriptionHandler.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "allowLogin": false,
            "allowRbac": false,
            "allowRoleDocumentLevelSecurity": false,
            "allowRoleFieldLevelSecurity": false,
            "layout": "error-xpack-unavailable",
            "showLinks": false,
            "showLogin": true,
            "showRoleMappingsManagement": false,
          },
        ]
      `);

      rawLicense$.next(licensingMock.createLicenseMock());
      expect(subscriptionHandler).toHaveBeenCalledTimes(2);
      expect(subscriptionHandler.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "allowLogin": false,
            "allowRbac": false,
            "allowRoleDocumentLevelSecurity": false,
            "allowRoleFieldLevelSecurity": false,
            "linksMessage": "Access is denied because Security is disabled in Elasticsearch.",
            "showLinks": false,
            "showLogin": false,
            "showRoleMappingsManagement": false,
          },
        ]
      `);
    } finally {
      subscription.unsubscribe();
    }
  });

  it('should show login page and other security elements, allow RBAC but forbid role m appings and document level security if license is basic.', () => {
    const mockRawLicense = licensingMock.createLicense({
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const getFeatureSpy = jest.spyOn(mockRawLicense, 'getFeature');

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
    });
    expect(getFeatureSpy).toHaveBeenCalledTimes(1);
    expect(getFeatureSpy).toHaveBeenCalledWith('security');
  });

  it('should not show login page or other security elements if security is disabled in Elasticsearch.', () => {
    const mockRawLicense = licensingMock.createLicense({
      features: { security: { isEnabled: false, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: false,
      allowLogin: false,
      showLinks: false,
      showRoleMappingsManagement: false,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: false,
      linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
    });
  });

  it('should allow role mappings, but not DLS/FLS if license = gold', () => {
    const mockRawLicense = licensingMock.createLicense({
      license: { mode: 'gold', type: 'gold' },
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowRoleDocumentLevelSecurity: false,
      allowRoleFieldLevelSecurity: false,
      allowRbac: true,
    });
  });

  it('should allow to login, allow RBAC, allow role mappings, and document level security if license >= platinum', () => {
    const mockRawLicense = licensingMock.createLicense({
      license: { mode: 'platinum', type: 'platinum' },
      features: { security: { isEnabled: true, isAvailable: true } },
    });

    const serviceSetup = new SecurityLicenseService().setup({
      license$: of(mockRawLicense),
    });
    expect(serviceSetup.license.getFeatures()).toEqual({
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleFieldLevelSecurity: true,
      allowRbac: true,
    });
  });
});
