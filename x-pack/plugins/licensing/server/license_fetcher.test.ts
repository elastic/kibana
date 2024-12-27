/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getLicenseFetcher } from './license_fetcher';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

type EsLicense = estypes.XpackInfoMinimalLicenseInformation;

const maxRetryDelay = 30 * 1000;
const sumOfRetryTimes = (1 + 2 + 4 + 8 + 16) * 1000;

function buildRawLicense(options: Partial<EsLicense> = {}): EsLicense {
  return {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    mode: 'basic',
    expiry_date_in_millis: 1000,
    ...options,
  };
}

describe('LicenseFetcher', () => {
  let logger: MockedLogger;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;

  beforeEach(() => {
    logger = loggerMock.create();
    clusterClient = elasticsearchServiceMock.createClusterClient();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the license for successful calls', async () => {
    clusterClient.asInternalUser.xpack.info.mockResponse({
      license: buildRawLicense({
        uid: 'license-1',
      }),
      features: {},
    } as any);

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    const license = await fetcher();
    expect(license.uid).toEqual('license-1');
  });

  it('returns the latest license for successful calls', async () => {
    clusterClient.asInternalUser.xpack.info
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any)
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-2',
        }),
        features: {},
      } as any);

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');

    license = await fetcher();
    expect(license.uid).toEqual('license-2');
  });

  it('returns an error license in case of error', async () => {
    jest.useFakeTimers();
    clusterClient.asInternalUser.xpack.info.mockResponseImplementation(() => {
      throw new Error('woups');
    });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    const licensePromise = fetcher();
    await jest.advanceTimersByTimeAsync(sumOfRetryTimes);
    const license = await licensePromise;

    expect(license.error).toEqual('woups');
    // should be called once to start and then in the retries after 1s, 2s, 4s, 8s and 16s
    expect(clusterClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(6);
  });

  it('returns a license successfully fetched after an error', async () => {
    jest.useFakeTimers();
    clusterClient.asInternalUser.xpack.info
      .mockResponseImplementationOnce(() => {
        throw new Error('woups');
      })
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any);

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    const licensePromise = fetcher();
    // wait one minute since we mocked only one error
    await jest.advanceTimersByTimeAsync(1000);
    const license = await licensePromise;

    expect(license.uid).toEqual('license-1');
    expect(clusterClient.asInternalUser.xpack.info).toBeCalledTimes(2);
  });

  it('returns the latest fetched license after an error within the cache duration period', async () => {
    jest.useFakeTimers();
    clusterClient.asInternalUser.xpack.info
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any)
      .mockResponseImplementation(() => {
        throw new Error('woups');
      });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');
    expect(clusterClient.asInternalUser.xpack.info).toBeCalledTimes(1);

    const licensePromise = fetcher();
    await jest.advanceTimersByTimeAsync(sumOfRetryTimes);
    license = await licensePromise;
    expect(license.uid).toEqual('license-1');
    // should be called once in the successful mock, once in the error mock
    // and then in the retries after 1s, 2s, 4s, 8s and 16s
    expect(clusterClient.asInternalUser.xpack.info).toBeCalledTimes(7);
  });

  it('returns an error license after an error exceeding the cache duration period', async () => {
    jest.useFakeTimers();
    clusterClient.asInternalUser.xpack.info
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any)
      .mockResponseImplementation(() => {
        throw new Error('woups');
      });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 1,
      maxRetryDelay,
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');

    const licensePromise = fetcher();
    await jest.advanceTimersByTimeAsync(sumOfRetryTimes);
    license = await licensePromise;
    expect(license.error).toEqual('woups');
  });

  it('logs a warning in case of successful call without license', async () => {
    clusterClient.asInternalUser.xpack.info.mockResponse({
      license: undefined,
      features: {},
    } as any);

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    const license = await fetcher();
    expect(license.isAvailable).toEqual(false);
    expect(loggerMock.collect(logger).warn.map((args) => args[0])).toMatchInlineSnapshot(`
      Array [
        "License information fetched from Elasticsearch, but no license is available",
      ]
    `);
  });

  it('logs a warning in case of successful call with a missing license', async () => {
    clusterClient.asInternalUser.xpack.info.mockResponse({
      license: buildRawLicense({
        type: 'missing',
      }),
      features: {},
    } as any);

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay,
    });

    const license = await fetcher();
    expect(license.isAvailable).toEqual(false);
    expect(loggerMock.collect(logger).warn.map((args) => args[0])).toMatchInlineSnapshot(`
      Array [
        "License information fetched from Elasticsearch, but no license is available",
      ]
    `);
  });

  it('testing the fetcher retry with a different maxRetryDelay using only errors', async () => {
    jest.useFakeTimers();
    clusterClient.asInternalUser.xpack.info.mockResponseImplementation(() => {
      throw new Error('woups');
    });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
      maxRetryDelay: 10 * 1000,
    });
    const sumOfRetryTimesUntilTen = (1 + 2 + 4 + 8) * 1000;

    const licensePromise = fetcher();
    await jest.advanceTimersByTimeAsync(sumOfRetryTimesUntilTen);
    const license = await licensePromise;

    expect(license.error).toEqual('woups');
    // should be called once to start and then in the retries after 1s, 2s, 4s and 8s
    expect(clusterClient.asInternalUser.xpack.info).toHaveBeenCalledTimes(5);
  });
});
