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
    const core = coreMock.createStart();
    maybeAddCloudLinks({
      core,
      security,
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
    const core = coreMock.createStart();
    const { chrome } = core;
    maybeAddCloudLinks({
      security,
      core,
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
            "label": "Profile",
            "order": 100,
            "setAsProfile": true,
          },
          Object {
            "href": "billing-url",
            "iconType": "visGauge",
            "label": "Billing",
            "order": 200,
          },
          Object {
            "href": "organization-url",
            "iconType": "gear",
            "label": "Organization",
            "order": 300,
          },
          Object {
            "content": <ThemDarkModeToggle
              security={
                Object {
                  "authc": Object {
                    "areAPIKeysEnabled": [MockFunction],
                    "getCurrentUser": [MockFunction] {
                      "calls": Array [
                        Array [],
                      ],
                      "results": Array [
                        Object {
                          "type": "return",
                          "value": Promise {},
                        },
                      ],
                    },
                  },
                  "hooks": Object {
                    "useUpdateUserProfile": [MockFunction],
                  },
                  "navControlService": Object {
                    "addUserMenuLinks": [MockFunction] {
                      "calls": Array [
                        [Circular],
                      ],
                      "results": Array [
                        Object {
                          "type": "return",
                          "value": undefined,
                        },
                      ],
                    },
                    "getUserMenuLinks$": [MockFunction],
                  },
                  "uiApi": Object {
                    "components": Object {
                      "getChangePassword": [MockFunction],
                      "getPersonalInfo": [MockFunction],
                    },
                  },
                  "userProfiles": Object {
                    "bulkGet": [MockFunction],
                    "getCurrent": [MockFunction],
                    "suggest": [MockFunction],
                    "update": [MockFunction],
                    "userProfile$": Observable {
                      "_subscribe": [Function],
                    },
                  },
                }
              }
              uiSettingsClient={
                Object {
                  "get": [MockFunction],
                  "get$": [MockFunction],
                  "getAll": [MockFunction],
                  "getUpdate$": [MockFunction],
                  "getUpdateErrors$": [MockFunction],
                  "isCustom": [MockFunction],
                  "isDeclared": [MockFunction],
                  "isDefault": [MockFunction],
                  "isOverridden": [MockFunction],
                  "remove": [MockFunction],
                  "set": [MockFunction],
                }
              }
            />,
            "href": "",
            "iconType": "",
            "label": "",
            "order": 400,
          },
        ],
      ]
    `);

    expect(chrome.setHelpMenuLinks).toHaveBeenCalledTimes(1);
    expect(chrome.setHelpMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "href": "https://www.elastic.co/guide/en/index.html",
            "title": "Documentation",
          },
          Object {
            "href": "https://www.elastic.co/support",
            "title": "Support",
          },
          Object {
            "href": "https://www.elastic.co/products/kibana/feedback?blade=kibanafeedback",
            "title": "Give feedback",
          },
        ],
      ]
    `);
  });

  it('when cloud enabled and it fails to fetch the user, it sets the links', async () => {
    const security = securityMock.createStart();
    security.authc.getCurrentUser.mockRejectedValue(new Error('Something went terribly wrong'));
    const core = coreMock.createStart();
    const { chrome } = core;
    maybeAddCloudLinks({
      security,
      core,
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
            "label": "Profile",
            "order": 100,
            "setAsProfile": true,
          },
          Object {
            "href": "billing-url",
            "iconType": "visGauge",
            "label": "Billing",
            "order": 200,
          },
          Object {
            "href": "organization-url",
            "iconType": "gear",
            "label": "Organization",
            "order": 300,
          },
          Object {
            "content": <ThemDarkModeToggle
              security={
                Object {
                  "authc": Object {
                    "areAPIKeysEnabled": [MockFunction],
                    "getCurrentUser": [MockFunction] {
                      "calls": Array [
                        Array [],
                      ],
                      "results": Array [
                        Object {
                          "type": "return",
                          "value": Promise {},
                        },
                      ],
                    },
                  },
                  "hooks": Object {
                    "useUpdateUserProfile": [MockFunction],
                  },
                  "navControlService": Object {
                    "addUserMenuLinks": [MockFunction] {
                      "calls": Array [
                        [Circular],
                      ],
                      "results": Array [
                        Object {
                          "type": "return",
                          "value": undefined,
                        },
                      ],
                    },
                    "getUserMenuLinks$": [MockFunction],
                  },
                  "uiApi": Object {
                    "components": Object {
                      "getChangePassword": [MockFunction],
                      "getPersonalInfo": [MockFunction],
                    },
                  },
                  "userProfiles": Object {
                    "bulkGet": [MockFunction],
                    "getCurrent": [MockFunction],
                    "suggest": [MockFunction],
                    "update": [MockFunction],
                    "userProfile$": Observable {
                      "_subscribe": [Function],
                    },
                  },
                }
              }
              uiSettingsClient={
                Object {
                  "get": [MockFunction],
                  "get$": [MockFunction],
                  "getAll": [MockFunction],
                  "getUpdate$": [MockFunction],
                  "getUpdateErrors$": [MockFunction],
                  "isCustom": [MockFunction],
                  "isDeclared": [MockFunction],
                  "isDefault": [MockFunction],
                  "isOverridden": [MockFunction],
                  "remove": [MockFunction],
                  "set": [MockFunction],
                }
              }
            />,
            "href": "",
            "iconType": "",
            "label": "",
            "order": 400,
          },
        ],
      ]
    `);
    expect(chrome.setHelpMenuLinks).toHaveBeenCalledTimes(1);
    expect(chrome.setHelpMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "href": "https://www.elastic.co/guide/en/index.html",
            "title": "Documentation",
          },
          Object {
            "href": "https://www.elastic.co/support",
            "title": "Support",
          },
          Object {
            "href": "https://www.elastic.co/products/kibana/feedback?blade=kibanafeedback",
            "title": "Give feedback",
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
    const core = coreMock.createStart();
    const { chrome } = core;
    maybeAddCloudLinks({
      security,
      core,
      cloud: { ...cloudMock.createStart(), isCloudEnabled: true },
    });
    // Since there's a promise, let's wait for the next tick
    await new Promise((resolve) => process.nextTick(resolve));
    expect(security.authc.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(chrome.setCustomNavLink).not.toHaveBeenCalled();
    expect(security.navControlService.addUserMenuLinks).not.toHaveBeenCalled();
    expect(chrome.setHelpMenuLinks).not.toHaveBeenCalledTimes(1);
  });
});
