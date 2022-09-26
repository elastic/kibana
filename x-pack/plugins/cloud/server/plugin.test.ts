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
import { cloudExperimentsMock } from '@kbn/cloud-experiments-plugin/common/mocks';
import { CloudExperimentsPluginSetup } from '@kbn/cloud-experiments-plugin/common';

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

    describe('Set up cloudExperiments', () => {
      describe('when cloud ID is not provided in the config', () => {
        let cloudExperiments: jest.Mocked<CloudExperimentsPluginSetup>;
        beforeEach(() => {
          const plugin = new CloudPlugin(
            coreMock.createPluginInitializerContext(config.schema.validate({}))
          );
          cloudExperiments = cloudExperimentsMock.createSetupMock();
          plugin.setup(coreMock.createSetup(), { cloudExperiments });
        });

        test('does not call cloudExperiments.identifyUser', async () => {
          expect(cloudExperiments.identifyUser).not.toHaveBeenCalled();
        });
      });

      describe('when cloud ID is provided in the config', () => {
        let cloudExperiments: jest.Mocked<CloudExperimentsPluginSetup>;
        beforeEach(() => {
          const plugin = new CloudPlugin(
            coreMock.createPluginInitializerContext(config.schema.validate({ id: 'cloud test' }))
          );
          cloudExperiments = cloudExperimentsMock.createSetupMock();
          plugin.setup(coreMock.createSetup(), { cloudExperiments });
        });

        test('calls cloudExperiments.identifyUser', async () => {
          expect(cloudExperiments.identifyUser).toHaveBeenCalledTimes(1);
        });

        test('the cloud ID is hashed when calling cloudExperiments.identifyUser', async () => {
          expect(cloudExperiments.identifyUser.mock.calls[0][0]).toEqual(
            '1acb4a1cc1c3d672a8d826055d897c2623ceb1d4fb07e46d97986751a36b06cf'
          );
        });

        test('specifies the Kibana version when calling cloudExperiments.identifyUser', async () => {
          expect(cloudExperiments.identifyUser.mock.calls[0][1]).toEqual(
            expect.objectContaining({
              kibanaVersion: 'version',
            })
          );
        });
      });
    });
  });
});
