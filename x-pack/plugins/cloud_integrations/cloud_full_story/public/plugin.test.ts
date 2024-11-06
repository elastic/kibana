/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { duration } from 'moment';
import { CloudFullStoryConfig, CloudFullStoryPlugin } from './plugin';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupFullStory', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({
        config = {},
        isCloudEnabled = true,
        isElasticStaffOwned = false,
      }: {
        config?: Partial<CloudFullStoryConfig>;
        isCloudEnabled?: boolean;
        isElasticStaffOwned?: boolean;
      }) => {
        const initContext = coreMock.createPluginInitializerContext(config);

        const plugin = new CloudFullStoryPlugin(initContext);

        const coreSetup = coreMock.createSetup();

        const cloud = { ...cloudMock.createSetup(), isCloudEnabled, isElasticStaffOwned };

        plugin.setup(coreSetup, { cloud });

        // Wait for FullStory dynamic import to resolve
        await new Promise((r) => setImmediate(r));

        return { initContext, plugin, coreSetup };
      };

      test('register the shipper FullStory with correct args when enabled and org_id are set', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
        });

        expect(coreSetup.analytics.registerShipper).toHaveBeenCalled();
        expect(coreSetup.analytics.registerShipper).toHaveBeenCalledWith(expect.anything(), {
          fullStoryOrgId: 'foo',
          scriptUrl: '/internal/cloud/100/fullstory.js',
          namespace: 'FSKibana',
          captureOnStartup: false,
        });
      });

      test('register the shipper FullStory with the correct duration', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo', pageVarsDebounceTime: `${duration(500, 'ms')}` },
        });

        expect(coreSetup.analytics.registerShipper).toHaveBeenCalled();
        expect(coreSetup.analytics.registerShipper).toHaveBeenCalledWith(expect.anything(), {
          fullStoryOrgId: 'foo',
          pageVarsDebounceTimeMs: 500,
          scriptUrl: '/internal/cloud/100/fullstory.js',
          namespace: 'FSKibana',
          captureOnStartup: false,
        });
      });

      it('does not call initializeFullStory when isCloudEnabled=false', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
          isCloudEnabled: false,
        });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });

      it('does set up FullStory when isCloudEnabled=true but the deployment is owned by an Elastician', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
          isCloudEnabled: true,
          isElasticStaffOwned: true,
        });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });

      it('does not call initializeFullStory when org_id is undefined', async () => {
        const { coreSetup } = await setupPlugin({ config: {} });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });
    });
  });
});
