/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { Sha256 } from '@kbn/crypto-browser';
import { nextTick } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { CloudPlugin, type CloudConfigType } from './plugin';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupFullStory', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({ config = {} }: { config?: Partial<CloudConfigType> }) => {
        const initContext = coreMock.createPluginInitializerContext({
          id: 'cloudId',
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/profile/alice',
          organization_url: '/org/myOrg',
          full_story: {
            enabled: false,
          },
          chat: {
            enabled: false,
          },
          ...config,
        });

        const plugin = new CloudPlugin(initContext);

        const coreSetup = coreMock.createSetup();

        const setup = plugin.setup(coreSetup, {});

        // Wait for FullStory dynamic import to resolve
        await new Promise((r) => setImmediate(r));

        return { initContext, plugin, setup, coreSetup };
      };

      test('register the shipper FullStory with correct args when enabled and org_id are set', async () => {
        const { coreSetup } = await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' } },
        });

        expect(coreSetup.analytics.registerShipper).toHaveBeenCalled();
        expect(coreSetup.analytics.registerShipper).toHaveBeenCalledWith(expect.anything(), {
          fullStoryOrgId: 'foo',
          scriptUrl: '/internal/cloud/100/fullstory.js',
          namespace: 'FSKibana',
        });
      });

      it('does not call initializeFullStory when enabled=false', async () => {
        const { coreSetup } = await setupPlugin({
          config: { full_story: { enabled: false, org_id: 'foo' } },
        });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });

      it('does not call initializeFullStory when org_id is undefined', async () => {
        const { coreSetup } = await setupPlugin({ config: { full_story: { enabled: true } } });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });
    });

    describe('setupTelemetryContext', () => {
      const username = '1234';
      const expectedHashedPlainUsername = new Sha256().update(username, 'utf8').digest('hex');

      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({
        config = {},
        securityEnabled = true,
        currentUserProps = {},
      }: {
        config?: Partial<CloudConfigType>;
        securityEnabled?: boolean;
        currentUserProps?: Record<string, any> | Error;
      }) => {
        const initContext = coreMock.createPluginInitializerContext({
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/profile/alice',
          organization_url: '/org/myOrg',
          full_story: {
            enabled: false,
          },
          chat: {
            enabled: false,
          },
          ...config,
        });

        const plugin = new CloudPlugin(initContext);

        const coreSetup = coreMock.createSetup();
        const securitySetup = securityMock.createSetup();
        if (currentUserProps instanceof Error) {
          securitySetup.authc.getCurrentUser.mockRejectedValue(currentUserProps);
        } else {
          securitySetup.authc.getCurrentUser.mockResolvedValue(
            securityMock.createMockAuthenticatedUser(currentUserProps)
          );
        }

        const setup = plugin.setup(coreSetup, securityEnabled ? { security: securitySetup } : {});

        return { initContext, plugin, setup, coreSetup };
      };

      test('register the context provider for the cloud user with hashed user ID when security is available', async () => {
        const { coreSetup } = await setupPlugin({
          config: { id: 'cloudId' },
          currentUserProps: { username },
        });

        expect(coreSetup.analytics.registerContextProvider).toHaveBeenCalled();

        const [{ context$ }] = coreSetup.analytics.registerContextProvider.mock.calls.find(
          ([{ name }]) => name === 'cloud_user_id'
        )!;

        await expect(firstValueFrom(context$)).resolves.toEqual({
          userId: '5ef112cfdae3dea57097bc276e275b2816e73ef2a398dc0ffaf5b6b4e3af2041',
          isElasticCloudUser: false,
        });
      });

      it('user hash includes cloud id', async () => {
        const { coreSetup: coreSetup1 } = await setupPlugin({
          config: { id: 'esOrg1' },
          currentUserProps: { username },
        });

        const [{ context$: context1$ }] =
          coreSetup1.analytics.registerContextProvider.mock.calls.find(
            ([{ name }]) => name === 'cloud_user_id'
          )!;

        const { userId: hashId1 } = (await firstValueFrom(context1$)) as { userId: string };
        expect(hashId1).not.toEqual(expectedHashedPlainUsername);

        const { coreSetup: coreSetup2 } = await setupPlugin({
          config: { full_story: { enabled: true, org_id: 'foo' }, id: 'esOrg2' },
          currentUserProps: { username },
        });

        const [{ context$: context2$ }] =
          coreSetup2.analytics.registerContextProvider.mock.calls.find(
            ([{ name }]) => name === 'cloud_user_id'
          )!;

        const { userId: hashId2 } = (await firstValueFrom(context2$)) as { userId: string };
        expect(hashId2).not.toEqual(expectedHashedPlainUsername);

        expect(hashId1).not.toEqual(hashId2);
      });

      test('user hash does not include cloudId when user is an Elastic Cloud user', async () => {
        const { coreSetup } = await setupPlugin({
          config: { id: 'cloudDeploymentId' },
          currentUserProps: { username, elastic_cloud_user: true },
        });

        expect(coreSetup.analytics.registerContextProvider).toHaveBeenCalled();

        const [{ context$ }] = coreSetup.analytics.registerContextProvider.mock.calls.find(
          ([{ name }]) => name === 'cloud_user_id'
        )!;

        await expect(firstValueFrom(context$)).resolves.toEqual({
          userId: expectedHashedPlainUsername,
          isElasticCloudUser: true,
        });
      });

      test('user hash does not include cloudId when not provided', async () => {
        const { coreSetup } = await setupPlugin({
          config: {},
          currentUserProps: { username },
        });

        expect(coreSetup.analytics.registerContextProvider).toHaveBeenCalled();

        const [{ context$ }] = coreSetup.analytics.registerContextProvider.mock.calls.find(
          ([{ name }]) => name === 'cloud_user_id'
        )!;

        await expect(firstValueFrom(context$)).resolves.toEqual({
          userId: expectedHashedPlainUsername,
          isElasticCloudUser: false,
        });
      });

      test('user hash is undefined when failed to fetch a user', async () => {
        const { coreSetup } = await setupPlugin({
          currentUserProps: new Error('failed to fetch a user'),
        });

        expect(coreSetup.analytics.registerContextProvider).toHaveBeenCalled();

        const [{ context$ }] = coreSetup.analytics.registerContextProvider.mock.calls.find(
          ([{ name }]) => name === 'cloud_user_id'
        )!;

        await expect(firstValueFrom(context$)).resolves.toEqual({
          userId: undefined,
          isElasticCloudUser: false,
        });
      });
    });

    describe('setupChat', () => {
      let consoleMock: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>;

      beforeEach(() => {
        consoleMock = jest.spyOn(console, 'debug').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleMock.mockRestore();
      });

      const setupPlugin = async ({
        config = {},
        securityEnabled = true,
        currentUserProps = {},
        isCloudEnabled = true,
        failHttp = false,
      }: {
        config?: Partial<CloudConfigType>;
        securityEnabled?: boolean;
        currentUserProps?: Record<string, any>;
        isCloudEnabled?: boolean;
        failHttp?: boolean;
      }) => {
        const initContext = coreMock.createPluginInitializerContext({
          id: isCloudEnabled ? 'cloud-id' : null,
          base_url: 'https://cloud.elastic.co',
          deployment_url: '/abc123',
          profile_url: '/profile/alice',
          organization_url: '/org/myOrg',
          full_story: {
            enabled: false,
          },
          chat: {
            enabled: false,
          },
          ...config,
        });

        const plugin = new CloudPlugin(initContext);

        const coreSetup = coreMock.createSetup();
        const coreStart = coreMock.createStart();

        if (failHttp) {
          coreSetup.http.get.mockImplementation(() => {
            throw new Error('HTTP request failed');
          });
        }

        coreSetup.getStartServices.mockResolvedValue([coreStart, {}, undefined]);

        const securitySetup = securityMock.createSetup();
        securitySetup.authc.getCurrentUser.mockResolvedValue(
          securityMock.createMockAuthenticatedUser(currentUserProps)
        );

        const setup = plugin.setup(coreSetup, securityEnabled ? { security: securitySetup } : {});

        return { initContext, plugin, setup, coreSetup };
      };

      it('chatConfig is not retrieved if cloud is not enabled', async () => {
        const { coreSetup } = await setupPlugin({ isCloudEnabled: false });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is not retrieved if security is not enabled', async () => {
        const { coreSetup } = await setupPlugin({ securityEnabled: false });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is not retrieved if chat is enabled but url is not provided', async () => {
        // @ts-expect-error 2741
        const { coreSetup } = await setupPlugin({ config: { chat: { enabled: true } } });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is not retrieved if internal API fails', async () => {
        const { coreSetup } = await setupPlugin({
          config: { chat: { enabled: true, chatURL: 'http://chat.elastic.co' } },
          failHttp: true,
        });
        expect(coreSetup.http.get).toHaveBeenCalled();
        expect(consoleMock).toHaveBeenCalled();
      });

      it('chatConfig is retrieved if chat is enabled and url is provided', async () => {
        const { coreSetup } = await setupPlugin({
          config: { chat: { enabled: true, chatURL: 'http://chat.elastic.co' } },
        });
        expect(coreSetup.http.get).toHaveBeenCalled();
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
          chat: {
            enabled: false,
          },
          full_story: {
            enabled: false,
          },
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
          chat: {
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
});
