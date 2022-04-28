/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Installation, PackageInfo } from '../../types';
import { getPackageInfo, getInstallation } from '../epm/packages';

import { getMonitoringPermissions } from './monitoring_permissions';

jest.mock('../epm/packages');

const mockedGetInstallation = getInstallation as jest.Mock<ReturnType<typeof getInstallation>>;
const mockedGetPackageInfo = getPackageInfo as jest.Mock<ReturnType<typeof getPackageInfo>>;

describe('getMonitoringPermissions', () => {
  describe('Without elastic agent package installed', () => {
    it('should return default logs and metrics permissions if both are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: true, metrics: true },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });
    it('should return default logs permissions if only logs are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: true, metrics: false },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });
    it('should return default metrics permissions if only metrics are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: false, metrics: true },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });

    it('should an empty valid permission entry if neither metrics and logs are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: false, metrics: false },
        'testnamespace123'
      );
      expect(permissions).toEqual({ _elastic_agent_monitoring: { indices: [] } });
    });
  });

  describe('With elastic agent package installed', () => {
    beforeEach(() => {
      // Mock a simplified elastic agent package with only 4 datastreams logs and metrics for filebeat and metricbeat
      mockedGetInstallation.mockResolvedValue({
        name: 'elastic_agent',
        version: '1.0.0',
      } as Installation);
      mockedGetPackageInfo.mockResolvedValue({
        data_streams: [
          {
            type: 'logs',
            dataset: 'elastic_agent.metricbeat',
          },
          {
            type: 'metrics',
            dataset: 'elastic_agent.metricbeat',
          },
          {
            type: 'logs',
            dataset: 'elastic_agent.filebeat',
          },
          {
            type: 'metrics',
            dataset: 'elastic_agent.filebeat',
          },
        ],
      } as PackageInfo);
    });
    it('should return default logs and metrics permissions if both are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: true, metrics: true },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });
    it('should return default logs permissions if only logs are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: true, metrics: false },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });
    it('should return default metrics permissions if only metrics are enabled', async () => {
      const permissions = await getMonitoringPermissions(
        savedObjectsClientMock.create(),
        { logs: false, metrics: true },
        'testnamespace123'
      );
      expect(permissions).toMatchSnapshot();
    });
  });
});
