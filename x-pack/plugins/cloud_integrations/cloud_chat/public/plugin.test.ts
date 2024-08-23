/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudChatConfigType } from '../server/config';
import { CloudChatPlugin } from './plugin';
import { type MockedLogger } from '@kbn/logging-mocks';

describe('Cloud Chat Plugin', () => {
  describe('#setup', () => {
    describe('setupChat', () => {
      let newTrialEndDate: Date;
      let logger: MockedLogger;

      beforeEach(() => {
        newTrialEndDate = new Date();
        newTrialEndDate.setDate(new Date().getDate() + 14);
      });

      const setupPlugin = async ({
        config = {},
        isCloudEnabled = true,
        failHttp = false,
        trialEndDate = newTrialEndDate,
      }: {
        config?: Partial<CloudChatConfigType>;
        isCloudEnabled?: boolean;
        failHttp?: boolean;
        trialEndDate?: Date;
      }) => {
        const initContext = coreMock.createPluginInitializerContext(config);
        logger = initContext.logger as MockedLogger;

        const plugin = new CloudChatPlugin(initContext);

        const coreSetup = coreMock.createSetup();
        const coreStart = coreMock.createStart();

        if (failHttp) {
          coreSetup.http.get.mockImplementation(async () => {
            throw new Error('HTTP request failed');
          });
        }

        coreSetup.getStartServices.mockResolvedValue([coreStart, {}, undefined]);

        const cloud = cloudMock.createSetup();

        plugin.setup(coreSetup, {
          cloud: { ...cloud, isCloudEnabled, trialEndDate },
        });

        // Wait for the async processes to complete
        await new Promise((resolve) => process.nextTick(resolve));

        return { initContext, plugin, coreSetup };
      };

      it('chatConfig is not retrieved if cloud is not enabled', async () => {
        const { coreSetup } = await setupPlugin({ isCloudEnabled: false });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is not retrieved if chat is enabled but url is not provided', async () => {
        // @ts-expect-error 2741
        const { coreSetup } = await setupPlugin({ config: { chat: { enabled: true } } });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is not retrieved if internal API fails', async () => {
        const { coreSetup } = await setupPlugin({
          config: { chatURL: 'http://chat.elastic.co', trialBuffer: 30 },
          failHttp: true,
        });
        expect(coreSetup.http.get).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(`Error setting up Chat`));
      });

      it('chatConfig is not retrieved if chat is enabled and url is provided but trial has expired', async () => {
        const date = new Date();
        date.setDate(new Date().getDate() - 44);
        const { coreSetup } = await setupPlugin({
          config: { chatURL: 'http://chat.elastic.co', trialBuffer: 30 },
          trialEndDate: date,
        });
        expect(coreSetup.http.get).not.toHaveBeenCalled();
      });

      it('chatConfig is retrieved if chat is enabled and url is provided and trial is active', async () => {
        const { coreSetup } = await setupPlugin({
          config: { chatURL: 'http://chat.elastic.co', trialBuffer: 30 },
          trialEndDate: new Date(),
        });
        expect(coreSetup.http.get).toHaveBeenCalled();
      });
    });
  });
});
