/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeCloudIdMock, parseDeploymentIdFromDeploymentUrlMock } from './plugin.test.mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { CloudConfigType } from './config';
import { CloudPlugin } from './plugin';
import type { DecodedCloudId } from '../common/decode_cloud_id';

const baseConfig = {
  base_url: 'https://cloud.elastic.co',
  deployment_url: '/abc123',
  profile_url: '/user/settings/',
  projects_url: '/projects/',
  organization_url: '/account/',
};

describe('Cloud Plugin', () => {
  beforeEach(() => {
    parseDeploymentIdFromDeploymentUrlMock.mockReset().mockReturnValue('deployment-id');
    decodeCloudIdMock.mockReset().mockReturnValue({});
  });

  const setupPlugin = (configParts: Partial<CloudConfigType> = {}) => {
    const initContext = coreMock.createPluginInitializerContext({
      ...baseConfig,
      id: 'cloudId',
      cname: 'cloud.elastic.co',
      ...configParts,
    });
    const plugin = new CloudPlugin(initContext);

    const coreSetup = coreMock.createSetup();
    const setup = plugin.setup(coreSetup, {});
    const start = plugin.start();

    return { setup, start };
  };

  describe('#setup', () => {
    describe('interface', () => {
      it('snapshot', () => {
        const { setup } = setupPlugin();
        expect(setup).toMatchSnapshot();
      });
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

      it('exposes apm', () => {
        const { setup } = setupPlugin();
        expect(setup.apm).toStrictEqual({ url: undefined, secretToken: undefined });
      });

      it('exposes deploymentId', () => {
        parseDeploymentIdFromDeploymentUrlMock.mockReturnValue('some-deployment-id');
        const { setup } = setupPlugin();
        expect(setup.deploymentId).toBe('some-deployment-id');
        expect(parseDeploymentIdFromDeploymentUrlMock).toHaveBeenCalledTimes(2); // called when registering the analytic context too
        expect(parseDeploymentIdFromDeploymentUrlMock).toHaveBeenCalledWith(
          baseConfig.deployment_url
        );
      });

      it('exposes components decoded from the cloudId', () => {
        const decodedId: DecodedCloudId = {
          defaultPort: '9000',
          host: 'host',
          elasticsearchUrl: 'elasticsearch-url',
          kibanaUrl: 'kibana-url',
        };
        decodeCloudIdMock.mockReturnValue(decodedId);
        const { setup } = setupPlugin();
        expect(setup).toEqual(
          expect.objectContaining({
            cloudDefaultPort: '9000',
            cloudHost: 'host',
            elasticsearchUrl: 'elasticsearch-url',
            kibanaUrl: 'kibana-url',
          })
        );
        expect(decodeCloudIdMock).toHaveBeenCalledTimes(1);
        expect(decodeCloudIdMock).toHaveBeenCalledWith('cloudId', expect.any(Object));
      });

      describe('isServerlessEnabled', () => {
        it('is `true` when `serverless.projectId` is set', () => {
          const { setup } = setupPlugin({
            serverless: {
              project_id: 'my-awesome-project',
            },
          });
          expect(setup.isServerlessEnabled).toBe(true);
        });

        it('is `false` when `serverless.projectId` is not set', () => {
          const { setup } = setupPlugin({
            serverless: undefined,
          });
          expect(setup.isServerlessEnabled).toBe(false);
        });
      });

      it('exposes `serverless.projectId`', () => {
        const { setup } = setupPlugin({
          serverless: {
            project_id: 'my-awesome-project',
          },
        });
        expect(setup.serverless.projectId).toBe('my-awesome-project');
      });

      it('exposes `serverless.projectName`', () => {
        const { setup } = setupPlugin({
          serverless: {
            project_id: 'my-awesome-project',
            project_name: 'My Awesome Project',
          },
        });
        expect(setup.serverless.projectName).toBe('My Awesome Project');
      });

      it('exposes `serverless.projectType`', () => {
        const { setup } = setupPlugin({
          serverless: {
            project_id: 'my-awesome-project',
            project_name: 'My Awesome Project',
            project_type: 'security',
          },
        });
        expect(setup.serverless.projectType).toBe('security');
      });
    });
  });

  describe('#start', () => {
    describe('interface', () => {
      it('snapshot', () => {
        const { start } = setupPlugin();
        expect(start).toMatchSnapshot();
      });
      it('exposes isCloudEnabled', () => {
        const { start } = setupPlugin();
        expect(start.isCloudEnabled).toBe(true);
      });
    });
  });
});
