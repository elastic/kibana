/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { CloudPlugin } from './plugin';

const baseConfig = {
  base_url: 'https://cloud.elastic.co',
  deployment_url: '/abc123',
  profile_url: '/user/settings/',
  organization_url: '/account/',
};

describe('Cloud Plugin', () => {
  const setupPlugin = () => {
    const initContext = coreMock.createPluginInitializerContext({
      ...baseConfig,
      id: 'cloudId',
      cname: 'cloud.elastic.co',
    });
    const plugin = new CloudPlugin(initContext);

    const coreSetup = coreMock.createSetup();
    const setup = plugin.setup(coreSetup, {});
    const start = plugin.start();

    return { setup, start };
  };

  describe('#setup', () => {
    describe('interface', () => {
      it('exposes isCloudEnabled', () => {
        const { setup } = setupPlugin();
        expect(setup.isCloudEnabled).toBe(true);
      });

      it('exposes cloudId', () => {
        const { setup } = setupPlugin();
        expect(setup.cloudId).toBe('cloudId');
      });

      it('exposes instanceSizeMb', () => {
        const { setup } = setupPlugin();
        expect(setup.instanceSizeMb).toBeUndefined();
      });

      it('exposes deploymentId', () => {
        const { setup } = setupPlugin();
        expect(setup.deploymentId).toBe('abc123');
      });

      it('exposes apm', () => {
        const { setup } = setupPlugin();
        expect(setup.apm).toStrictEqual({ url: undefined, secretToken: undefined });
      });
    });
  });

  describe('#start', () => {
    describe('interface', () => {
      it('exposes isCloudEnabled', () => {
        const { start } = setupPlugin();
        expect(start.isCloudEnabled).toBe(true);
      });
    });
  });
});
