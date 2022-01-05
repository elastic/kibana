/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nextTick } from '@kbn/test/jest';
import { coreMock } from 'src/core/public/mocks';
import { homePluginMock } from 'src/plugins/home/public/mocks';
import { securityMock } from '../../security/public/mocks';
import { customEventsApiMock } from './plugin.test.mocks';
import { CloudPlugin, CloudConfigType } from './plugin';
import { Observable, Subject } from 'rxjs';
import { loadUserId } from './custom_events_system';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupFullstory', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({
        config = {},
        securityEnabled = true,
        currentUserProps = {},
        currentAppId$ = undefined,
      }: {
        config?: Partial<CloudConfigType>;
        securityEnabled?: boolean;
        currentUserProps?: Record<string, any>;
        currentAppId$?: Observable<string | undefined>;
      }) => {
        const initContext = coreMock.createPluginInitializerContext({
          id: 'cloudId',
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/profile/alice',
          organization_url: '/org/myOrg',
          full_story: {
            enabled: false,
          },
          ...config,
        });

        const plugin = new CloudPlugin(initContext);

        const coreSetup = coreMock.createSetup();
        const coreStart = coreMock.createStart();
        if (currentAppId$) {
          coreStart.application.currentAppId$ = currentAppId$;
        }
        coreSetup.getStartServices.mockResolvedValue([coreStart, {}, undefined]);
        const securitySetup = securityMock.createSetup();
        securitySetup.authc.getCurrentUser.mockResolvedValue(
          securityMock.createMockAuthenticatedUser(currentUserProps)
        );

        const setup = plugin.setup(coreSetup, securityEnabled ? { security: securitySetup } : {});
        // Wait for fullstory dynamic import to resolve
        await new Promise((r) => setImmediate(r));

        return { initContext, plugin, setup };
      };

      it('calls initializeFullStory with correct args when enabled and org_id are set', async () => {
        const { initContext } = await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
          currentUserProps: {
            username: '1234',
          },
        });

        expect(customEventsApiMock.initialize).toHaveBeenCalled();
        const { basePath, fullstoryOrgId, packageInfo } =
          customEventsApiMock.initialize.mock.calls[0][0];
        expect(basePath.prepend).toBeDefined();
        expect(fullstoryOrgId).toEqual('foo');
        expect(packageInfo).toEqual(initContext.env.packageInfo);
      });

      it('calls FS.setUserContext everytime an app changes', async () => {
        const currentAppId$ = new Subject<string | undefined>();
        const { plugin } = await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
          currentUserProps: {
            username: '1234',
          },
          currentAppId$,
        });

        expect(customEventsApiMock.setCustomEventContext).not.toHaveBeenCalled();
        currentAppId$.next('App1');
        expect(customEventsApiMock.setCustomEventContext).toHaveBeenCalledWith({
          appId: 'App1',
        });
        currentAppId$.next();
        expect(customEventsApiMock.setCustomEventContext).toHaveBeenCalledWith({
          appId: 'unknown',
        });

        currentAppId$.next('App2');
        expect(customEventsApiMock.setCustomEventContext).toHaveBeenCalledWith({
          appId: 'App2',
        });

        expect(currentAppId$.observers.length).toBe(1);
        plugin.stop();
        expect(currentAppId$.observers.length).toBe(0);
      });

      it('initializes when security is not available', async () => {
        await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
          securityEnabled: false,
        });

        expect(customEventsApiMock.initialize).toHaveBeenCalled();
      });

      describe('with memory', () => {
        beforeAll(() => {
          // @ts-expect-error 2339
          window.performance.memory = {
            get jsHeapSizeLimit() {
              return 3;
            },
            get totalJSHeapSize() {
              return 2;
            },
            get usedJSHeapSize() {
              return 1;
            },
          };
        });

        afterAll(() => {
          // @ts-expect-error 2339
          delete window.performance.memory;
        });

        it('calls reportCustomEvent when security is available', async () => {
          await setupPlugin({
            config: { full_story: { enabled: true, org_id: 'foo' } },
            currentUserProps: {
              username: '1234',
            },
          });

          expect(customEventsApiMock.reportCustomEvent).toHaveBeenCalledWith('kibana-loaded');
        });
      });

      it('calls reportCustomEvent when security is not available', async () => {
        await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
          securityEnabled: false,
        });

        expect(customEventsApiMock.reportCustomEvent).toHaveBeenCalledWith('kibana-loaded');
      });

      it('calls FS.event when FS.identify throws an error', async () => {
        customEventsApiMock.initialize.mockImplementationOnce(() => {
          throw new Error(`identify failed!`);
        });
        await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
          currentUserProps: {
            username: '1234',
          },
        });

        expect(customEventsApiMock.reportCustomEvent).toHaveBeenCalledWith('kibana-loaded');
      });

      it('does not call initializeFullStory when enabled=false', async () => {
        await setupPlugin({ config: { full_story: { enabled: false, org_id: 'foo' } } });
        expect(customEventsApiMock.initialize).not.toHaveBeenCalled();
      });

      it('does not call initializeFullStory when org_id is undefined', async () => {
        await setupPlugin({ config: { full_story: { enabled: true } } });
        expect(customEventsApiMock.initialize).not.toHaveBeenCalled();
      });
    });

    describe('interface', () => {
      const setupPlugin = () => {
        const initContext = coreMock.createPluginInitializerContext({
          id: 'cloudId',
          cname: 'cloud.elastic.co',
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/user/settings/',
          organization_url: '/account/',
        });
        const plugin = new CloudPlugin(initContext);

        const coreSetup = coreMock.createSetup();
        const setup = plugin.setup(coreSetup, {});

        return { setup };
      };

      it('exposes isCloudEnabled', () => {
        const { setup } = setupPlugin();
        expect(setup.isCloudEnabled).toBe(true);
      });

      it('exposes cloudId', () => {
        const { setup } = setupPlugin();
        expect(setup.cloudId).toBe('cloudId');
      });

      it('exposes baseUrl', () => {
        const { setup } = setupPlugin();
        expect(setup.baseUrl).toBe('https://cloud.elastic.co');
      });

      it('exposes deploymentUrl', () => {
        const { setup } = setupPlugin();
        expect(setup.deploymentUrl).toBe('https://cloud.elastic.co/abc123');
      });

      it('exposes snapshotsUrl', () => {
        const { setup } = setupPlugin();
        expect(setup.snapshotsUrl).toBe('https://cloud.elastic.co/abc123/elasticsearch/snapshots/');
      });

      it('exposes profileUrl', () => {
        const { setup } = setupPlugin();
        expect(setup.profileUrl).toBe('https://cloud.elastic.co/user/settings/');
      });

      it('exposes organizationUrl', () => {
        const { setup } = setupPlugin();
        expect(setup.organizationUrl).toBe('https://cloud.elastic.co/account/');
      });

      it('exposes cname', () => {
        const { setup } = setupPlugin();
        expect(setup.cname).toBe('cloud.elastic.co');
      });
    });
  });

  describe('#start', () => {
    const startPlugin = () => {
      const plugin = new CloudPlugin(
        coreMock.createPluginInitializerContext({
          id: 'cloudId',
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/profile/alice',
          organization_url: '/org/myOrg',
          full_story: {
            enabled: false,
          },
        })
      );
      const coreSetup = coreMock.createSetup();
      const homeSetup = homePluginMock.createSetupContract();

      plugin.setup(coreSetup, { home: homeSetup });

      return { coreSetup, plugin };
    };

    it('registers help support URL', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      plugin.start(coreStart, { security: securityStart });

      expect(coreStart.chrome.setHelpSupportUrl).toHaveBeenCalledTimes(1);
      expect(coreStart.chrome.setHelpSupportUrl.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "https://cloud.elastic.co/support",
        ]
      `);
    });

    it('does not register custom nav links on anonymous pages', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);

      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockResolvedValue(
        securityMock.createMockAuthenticatedUser({
          roles: ['superuser'],
        })
      );

      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(coreStart.chrome.setCustomNavLink).not.toHaveBeenCalled();
      expect(securityStart.authc.getCurrentUser).not.toHaveBeenCalled();
    });

    it('registers a custom nav link for superusers', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockResolvedValue(
        securityMock.createMockAuthenticatedUser({
          roles: ['superuser'],
        })
      );
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(coreStart.chrome.setCustomNavLink).toHaveBeenCalledTimes(1);
      expect(coreStart.chrome.setCustomNavLink.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "euiIconType": "logoCloud",
            "href": "https://cloud.elastic.co/abc123",
            "title": "Manage this deployment",
          },
        ]
      `);
    });

    it('registers a custom nav link when there is an error retrieving the current user', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockRejectedValue(new Error('something happened'));
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(coreStart.chrome.setCustomNavLink).toHaveBeenCalledTimes(1);
      expect(coreStart.chrome.setCustomNavLink.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "euiIconType": "logoCloud",
            "href": "https://cloud.elastic.co/abc123",
            "title": "Manage this deployment",
          },
        ]
      `);
    });

    it('does not register a custom nav link for non-superusers', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockResolvedValue(
        securityMock.createMockAuthenticatedUser({
          roles: ['not-a-superuser'],
        })
      );
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(coreStart.chrome.setCustomNavLink).not.toHaveBeenCalled();
    });

    it('registers user profile links for superusers', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockResolvedValue(
        securityMock.createMockAuthenticatedUser({
          roles: ['superuser'],
        })
      );
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(securityStart.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
      expect(securityStart.navControlService.addUserMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "href": "https://cloud.elastic.co/profile/alice",
              "iconType": "user",
              "label": "Profile",
              "order": 100,
              "setAsProfile": true,
            },
            Object {
              "href": "https://cloud.elastic.co/org/myOrg",
              "iconType": "gear",
              "label": "Account & Billing",
              "order": 200,
            },
          ],
        ]
      `);
    });

    it('registers profile links when there is an error retrieving the current user', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockRejectedValue(new Error('something happened'));
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(securityStart.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
      expect(securityStart.navControlService.addUserMenuLinks.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "href": "https://cloud.elastic.co/profile/alice",
              "iconType": "user",
              "label": "Profile",
              "order": 100,
              "setAsProfile": true,
            },
            Object {
              "href": "https://cloud.elastic.co/org/myOrg",
              "iconType": "gear",
              "label": "Account & Billing",
              "order": 200,
            },
          ],
        ]
      `);
    });

    it('does not register profile links for non-superusers', async () => {
      const { plugin } = startPlugin();

      const coreStart = coreMock.createStart();
      const securityStart = securityMock.createStart();
      securityStart.authc.getCurrentUser.mockResolvedValue(
        securityMock.createMockAuthenticatedUser({
          roles: ['not-a-superuser'],
        })
      );
      plugin.start(coreStart, { security: securityStart });

      await nextTick();

      expect(securityStart.navControlService.addUserMenuLinks).not.toHaveBeenCalled();
    });
  });

  describe('loadUserId', () => {
    let consoleMock: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>;

    beforeEach(() => {
      consoleMock = jest.spyOn(console, 'debug').mockImplementation(() => {});
    });
    afterEach(() => {
      consoleMock.mockRestore();
    });

    it('returns principal ID when username specified', async () => {
      expect(
        await loadUserId({
          getCurrentUser: jest.fn().mockResolvedValue({
            username: '1234',
          }),
        })
      ).toEqual('1234');
      expect(consoleMock).not.toHaveBeenCalled();
    });

    it('returns undefined if getCurrentUser throws', async () => {
      expect(
        await loadUserId({
          getCurrentUser: jest.fn().mockRejectedValue(new Error(`Oh no!`)),
        })
      ).toBeUndefined();
    });

    it('returns undefined if getCurrentUser returns undefined', async () => {
      expect(
        await loadUserId({
          getCurrentUser: jest.fn().mockResolvedValue(undefined),
        })
      ).toBeUndefined();
    });

    it('returns undefined and logs if username undefined', async () => {
      expect(
        await loadUserId({
          getCurrentUser: jest.fn().mockResolvedValue({
            username: undefined,
            metadata: { foo: 'bar' },
          }),
        })
      ).toBeUndefined();
      expect(consoleMock).toHaveBeenLastCalledWith(
        `[cloud] username not specified. User metadata: {"foo":"bar"}`
      );
    });
  });
});
