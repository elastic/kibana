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

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');

    license = await fetcher();
    expect(license.uid).toEqual('license-2');
  });

  it('returns an error license in case of error', async () => {
    clusterClient.asInternalUser.xpack.info.mockResponseImplementation(() => {
      throw new Error('woups');
    });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
    });

    const license = await fetcher();
    expect(license.error).toEqual('woups');
  });

  it('returns a license successfully fetched after an error', async () => {
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
    });

    let license = await fetcher();
    expect(license.error).toEqual('woups');
    license = await fetcher();
    expect(license.uid).toEqual('license-1');
  });

  it('returns the latest fetched license after an error within the cache duration period', async () => {
    clusterClient.asInternalUser.xpack.info
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any)
      .mockResponseImplementationOnce(() => {
        throw new Error('woups');
      });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 50_000,
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');
    license = await fetcher();
    expect(license.uid).toEqual('license-1');
  });

  it('returns an error license after an error exceeding the cache duration period', async () => {
    clusterClient.asInternalUser.xpack.info
      .mockResponseOnce({
        license: buildRawLicense({
          uid: 'license-1',
        }),
        features: {},
      } as any)
      .mockResponseImplementationOnce(() => {
        throw new Error('woups');
      });

    const fetcher = getLicenseFetcher({
      logger,
      clusterClient,
      cacheDurationMs: 1,
    });

    let license = await fetcher();
    expect(license.uid).toEqual('license-1');

    await delay(50);

    license = await fetcher();
    expect(license.error).toEqual('woups');
  });
});
