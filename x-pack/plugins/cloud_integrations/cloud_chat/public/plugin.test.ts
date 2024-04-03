/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import type { CloudChatConfigType } from '../server/config';
import { CloudChatPlugin } from './plugin';

describe('Cloud Chat Plugin', () => {
  describe('#setup', () => {
    describe('setupChat', () => {
      let consoleMock: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>;
      let newTrialEndDate: Date;

      beforeEach(() => {
        consoleMock = jest.spyOn(console, 'debug').mockImplementation(() => {});
        newTrialEndDate = new Date();
        newTrialEndDate.setDate(new Date().getDate() + 14);
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
        trialEndDate = newTrialEndDate,
      }: {
        config?: Partial<CloudChatConfigType>;
        securityEnabled?: boolean;
        currentUserProps?: Record<string, any>;
        isCloudEnabled?: boolean;
        failHttp?: boolean;
        trialEndDate?: Date;
      }) => {
        const initContext = coreMock.createPluginInitializerContext(config);

        const plugin = new CloudChatPlugin(initContext);

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

        const cloud = cloudMock.createSetup();

        plugin.setup(coreSetup, {
          cloud: { ...cloud, isCloudEnabled, trialEndDate },
          ...(securityEnabled ? { security: securitySetup } : {}),
        });

        return { initContext, plugin, coreSetup };
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
          config: { chatURL: 'http://chat.elastic.co', trialBuffer: 30 },
          failHttp: true,
        });
        expect(coreSetup.http.get).toHaveBeenCalled();
        expect(consoleMock).toHaveBeenCalled();
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
