/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { maybeAddCloudLinks } from './maybe_add_cloud_links';

describe('maybeAddCloudLinks', () => {
  it('should skip if cloud is disabled', async () => {
    const security = securityMock.createStart();
    maybeAddCloudLinks({
      security,
      chrome: coreMock.createStart().chrome,
      cloud: { ...cloudMock.createStart(), isCloudEnabled: false },
    });
    // Since there's a promise, let's wait for the next tick
    await new Promise((resolve) => process.nextTick(resolve));
    expect(security.authc.getCurrentUser).not.toHaveBeenCalled();
  });

  it('when cloud enabled and the user is an Elastic Cloud user, it sets the links', async () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockResolvedValue(
      securityMock.createMockAuthenticatedUser({ elastic_cloud_user: true })
    );
    const chrome = coreMock.createStart().chrome;
    maybeAddCloudLinks({
      security,
      chrome,
      cloud: { ...cloudMock.createStart(), isCloudEnabled: true },
    });
    // Since there's a promise, let's wait for the next tick
    await new Promise((resolve) => process.nextTick(resolve));
    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "euiIconType": "logoCloud",
          "href": "deployment-url",
          "title": "Manage this deployment",
        },
      ]
    `);
    expect(security.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
    expect(security.navControlService.addUserMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "href": "profile-url",
            "iconType": "user",
            "label": "Edit profile",
            "order": 100,
            "setAsProfile": true,
          },
          Object {
            "href": "organization-url",
            "iconType": "gear",
            "label": "Account & Billing",
            "order": 200,
          },
        ],
      ]
    `);
  });

  it('when cloud enabled and it fails to fetch the user, it sets the links', async () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockRejectedValue(new Error('Something went terribly wrong'));
    const chrome = coreMock.createStart().chrome;
    maybeAddCloudLinks({
      security,
      chrome,
      cloud: { ...cloudMock.createStart(), isCloudEnabled: true },
    });
    // Since there's a promise, let's wait for the next tick
    await new Promise((resolve) => process.nextTick(resolve));
    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "euiIconType": "logoCloud",
          "href": "deployment-url",
          "title": "Manage this deployment",
        },
      ]
    `);
    expect(security.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
    expect(security.navControlService.addUserMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "href": "profile-url",
            "iconType": "user",
            "label": "Edit profile",
            "order": 100,
            "setAsProfile": true,
          },
          Object {
            "href": "organization-url",
            "iconType": "gear",
            "label": "Account & Billing",
            "order": 200,
          },
        ],
      ]
    `);
  });

  it('when cloud enabled and the user is NOT an Elastic Cloud user, it does not set the links', async () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockResolvedValue(
      securityMock.createMockAuthenticatedUser({ elastic_cloud_user: false })
    );
    const chrome = coreMock.createStart().chrome;
    maybeAddCloudLinks({
      security,
      chrome,
      cloud: { ...cloudMock.createStart(), isCloudEnabled: true },
    });
    // Since there's a promise, let's wait for the next tick
    await new Promise((resolve) => process.nextTick(resolve));
    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink).not.toHaveBeenCalled();
    expect(security.navControlService.addUserMenuLinks).not.toHaveBeenCalled();
  });
});
