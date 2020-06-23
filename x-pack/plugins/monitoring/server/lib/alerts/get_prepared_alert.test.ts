/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPreparedAlert } from './get_prepared_alert';
import { fetchClusters } from './fetch_clusters';
import { fetchDefaultEmailAddress } from './fetch_default_email_address';

jest.mock('./fetch_clusters', () => ({
  fetchClusters: jest.fn(),
}));

jest.mock('./fetch_default_email_address', () => ({
  fetchDefaultEmailAddress: jest.fn(),
}));

describe('getPreparedAlert', () => {
  const uiSettings = { get: jest.fn() };
  const alertType = 'test';
  const getUiSettingsService = async () => ({
    asScopedToClient: () => uiSettings,
  });
  const monitoringCluster = null;
  const logger = { warn: jest.fn() };
  const ccsEnabled = false;
  const services = {
    callCluster: jest.fn(),
    savedObjectsClient: null,
  };
  const emailAddress = 'foo@foo.com';
  const data = [{ foo: 1 }];
  const dataFetcher = () => data;
  const clusterName = 'MonitoringCluster';
  const clusterUuid = 'sdf34sdf';
  const clusters = [{ clusterName, clusterUuid }];

  afterEach(() => {
    (uiSettings.get as jest.Mock).mockClear();
    (services.callCluster as jest.Mock).mockClear();
    (fetchClusters as jest.Mock).mockClear();
    (fetchDefaultEmailAddress as jest.Mock).mockClear();
  });

  beforeEach(() => {
    (fetchClusters as jest.Mock).mockImplementation(() => clusters);
    (fetchDefaultEmailAddress as jest.Mock).mockImplementation(() => emailAddress);
  });

  it('should return fields as expected', async () => {
    (uiSettings.get as jest.Mock).mockImplementation(() => {
      return emailAddress;
    });

    const alert = await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      ccsEnabled,
      services as any,
      dataFetcher as any
    );

    expect(alert && alert.emailAddress).toBe(emailAddress);
    expect(alert && alert.data).toBe(data);
  });

  it('should add ccs if specified', async () => {
    const ccsClusterName = 'remoteCluster';
    (services.callCluster as jest.Mock).mockImplementation(() => {
      return {
        [ccsClusterName]: {
          connected: true,
        },
      };
    });

    await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      true,
      services as any,
      dataFetcher as any
    );

    expect((fetchClusters as jest.Mock).mock.calls[0][1].includes(ccsClusterName)).toBe(true);
  });

  it('should ignore ccs if no remote clusters are available', async () => {
    const ccsClusterName = 'remoteCluster';
    (services.callCluster as jest.Mock).mockImplementation(() => {
      return {
        [ccsClusterName]: {
          connected: false,
        },
      };
    });

    await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      true,
      services as any,
      dataFetcher as any
    );

    expect((fetchClusters as jest.Mock).mock.calls[0][1].includes(ccsClusterName)).toBe(false);
  });

  it('should pass in the clusters into the data fetcher', async () => {
    const customDataFetcher = jest.fn(() => data);

    await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      true,
      services as any,
      customDataFetcher as any
    );

    expect((customDataFetcher as jest.Mock).mock.calls[0][1]).toBe(clusters);
  });

  it('should return nothing if the data fetcher returns nothing', async () => {
    const customDataFetcher = jest.fn(() => []);

    const result = await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      true,
      services as any,
      customDataFetcher as any
    );

    expect(result).toBe(null);
  });

  it('should return nothing if there is no email address', async () => {
    (fetchDefaultEmailAddress as jest.Mock).mockImplementation(() => null);

    const result = await getPreparedAlert(
      alertType,
      getUiSettingsService as any,
      monitoringCluster as any,
      logger as any,
      true,
      services as any,
      dataFetcher as any
    );

    expect(result).toBe(null);
  });
});
