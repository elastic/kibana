/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { CloudGainSightConfigType } from '../server/config';
import { CloudGainSightPlugin } from './plugin';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupGainSight', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      const setupPlugin = async ({
        config = {},
        isCloudEnabled = true,
      }: {
        config?: Partial<CloudGainSightConfigType>;
        isCloudEnabled?: boolean;
      }) => {
        const initContext = coreMock.createPluginInitializerContext(config);

        const plugin = new CloudGainSightPlugin(initContext);

        const coreSetup = coreMock.createSetup();

        const cloud = { ...cloudMock.createSetup(), isCloudEnabled };

        plugin.setup(coreSetup, { cloud });

        // Wait for GainSight dynamic import to resolve
        await new Promise((r) => setImmediate(r));

        return { initContext, plugin, coreSetup };
      };

      test('register the shipper GainSight with correct args when enabled and org_id are set', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
        });

        expect(coreSetup.analytics.registerShipper).toHaveBeenCalled();
        expect(coreSetup.analytics.registerShipper).toHaveBeenCalledWith(expect.anything(), {
          gainSightOrgId: 'foo',
          scriptUrl: '/internal/cloud/100/gainsight.js',
          cssFileEndpoint: '/internal/cloud/100/gainsight.css',
          widgetFileEndpoint: '/internal/cloud/100/gainsight_widget.js',
        });
      });

      it('does not call initializeGainSight when isCloudEnabled=false', async () => {
        const { coreSetup } = await setupPlugin({
          config: { org_id: 'foo' },
          isCloudEnabled: false,
        });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });

      it('does not call initializeGainSight when org_id is undefined', async () => {
        const { coreSetup } = await setupPlugin({ config: {} });
        expect(coreSetup.analytics.registerShipper).not.toHaveBeenCalled();
      });
    });
  });
});
