/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { CloudFullStoryConfigType } from '../server/config';
import { CloudFullStoryPlugin } from './plugin';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupFullStory', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({
        config = {},
        isCloudEnabled = true,
      }: {
        config?: Partial<CloudFullStoryConfigType>;
        isCloudEnabled?: boolean;
      }) => {
        const initContext = coreMock.createPluginInitializerContext(config);

        const plugin = new CloudFullStoryPlugin(initContext);

        const coreSetup = coreMock.createSetup();

        const cloud = { ...cloudMock.createSetup(), isCloudEnabled };

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
        });
      });

      it('does not call initializeFullStory when isCloudEnabled=false', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
          isCloudEnabled: false,
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
