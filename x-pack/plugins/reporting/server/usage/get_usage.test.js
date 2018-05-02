/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { getReportingUsage } from './get_usage';

function getServerMock(customization) {
  const getLicenseCheckResults = sinon.stub().returns({});
  const defaultServerMock = {
    plugins: {
      security: {
        isAuthenticated: sinon.stub().returns(true)
      },
      xpack_main: {
        info: {
          isAvailable: sinon.stub().returns(true),
          feature: () => ({
            getLicenseCheckResults
          }),
          license: {
            isOneOf: sinon.stub().returns(false),
            getType: sinon.stub().returns('platinum'),
          },
          toJSON: () => ({ b: 1 })
        }
      }
    },
    expose: () => {},
    log: () => {},
    config: () => ({
      get: key => {
        if (key === 'xpack.reporting.enabled') {
          return true;
        } else if (key === 'xpack.reporting.index') {
          return '.reporting-index';
        }
      }
    })
  };
  return Object.assign(defaultServerMock, customization);
}

test('sets enabled to false when reporting is turned off', async () => {
  const mockConfigGet = jest.fn(key => {
    if (key === 'xpack.reporting.enabled') {
      return false;
    } else if (key.indexOf('xpack.reporting') >= 0) {
      throw new Error('Unknown config key!');
    }
  });
  const serverMock = getServerMock({ config: () => ({ get: mockConfigGet }) });
  const callClusterMock = jest.fn();
  const usageStats = await getReportingUsage(callClusterMock, serverMock);
  expect(usageStats.enabled).toBe(false);
});

describe('with a basic license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithBasicLicenseMock = getServerMock();
    serverWithBasicLicenseMock.plugins.xpack_main.info.license.getType = sinon.stub().returns('basic');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    usageStats = await getReportingUsage(callClusterMock, serverWithBasicLicenseMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to true', async () => {
    expect(usageStats.csv.available).toBe(true);
  });

  test('sets pdf availability to false', async () => {
    expect(usageStats.printable_pdf.available).toBe(false);
  });
});

describe('with no license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithNoLicenseMock = getServerMock();
    serverWithNoLicenseMock.plugins.xpack_main.info.license.getType = sinon.stub().returns('none');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    usageStats = await getReportingUsage(callClusterMock, serverWithNoLicenseMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to false', async () => {
    expect(usageStats.csv.available).toBe(false);
  });

  test('sets pdf availability to false', async () => {
    expect(usageStats.printable_pdf.available).toBe(false);
  });
});

describe('with platinum license', async () => {
  let usageStats;
  beforeAll(async () => {
    const serverWithPlatinumLicenseMock = getServerMock();
    serverWithPlatinumLicenseMock.plugins.xpack_main.info.license.getType = sinon.stub().returns('platinum');
    const callClusterMock = jest.fn(() => Promise.resolve({}));
    usageStats = await getReportingUsage(callClusterMock, serverWithPlatinumLicenseMock);
  });

  test('sets enables to true', async () => {
    expect(usageStats.enabled).toBe(true);
  });

  test('sets csv available to true', async () => {
    expect(usageStats.csv.available).toBe(true);
  });

  test('sets pdf availability to true', async () => {
    expect(usageStats.printable_pdf.available).toBe(true);
  });
});
