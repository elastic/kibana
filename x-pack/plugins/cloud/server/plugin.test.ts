/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { CloudPlugin } from './plugin';
import { config } from './config';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';

describe('Cloud Plugin', () => {
  describe('#setup', () => {
    describe('setupSecurity', () => {
      it('properly handles missing optional Security dependency if Cloud ID is NOT set.', async () => {
        const plugin = new CloudPlugin(
          coreMock.createPluginInitializerContext(config.schema.validate({}))
        );

        expect(() =>
          plugin.setup(coreMock.createSetup(), {
            usageCollection: usageCollectionPluginMock.createSetupContract(),
          })
        ).not.toThrow();
      });

      it('properly handles missing optional Security dependency if Cloud ID is set.', async () => {
        const plugin = new CloudPlugin(
          coreMock.createPluginInitializerContext(config.schema.validate({ id: 'my-cloud' }))
        );

        expect(() =>
          plugin.setup(coreMock.createSetup(), {
            usageCollection: usageCollectionPluginMock.createSetupContract(),
          })
        ).not.toThrow();
      });

      it('does not notify Security plugin about Cloud environment if Cloud ID is NOT set.', async () => {
        const plugin = new CloudPlugin(
          coreMock.createPluginInitializerContext(config.schema.validate({}))
        );

        const securityDependencyMock = securityMock.createSetup();
        plugin.setup(coreMock.createSetup(), {
          security: securityDependencyMock,
          usageCollection: usageCollectionPluginMock.createSetupContract(),
        });

        expect(securityDependencyMock.setIsElasticCloudDeployment).not.toHaveBeenCalled();
      });

      it('properly notifies Security plugin about Cloud environment if Cloud ID is set.', async () => {
        const plugin = new CloudPlugin(
          coreMock.createPluginInitializerContext(config.schema.validate({ id: 'my-cloud' }))
        );

        const securityDependencyMock = securityMock.createSetup();
        plugin.setup(coreMock.createSetup(), {
          security: securityDependencyMock,
          usageCollection: usageCollectionPluginMock.createSetupContract(),
        });

        expect(securityDependencyMock.setIsElasticCloudDeployment).toHaveBeenCalledTimes(1);
      });
    });
  });
});
