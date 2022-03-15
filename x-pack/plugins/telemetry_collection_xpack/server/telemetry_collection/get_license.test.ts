/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { getLicenseFromLocalOrMaster } from './get_license';

describe('getLicenseFromLocalOrMaster', () => {
  test('return an undefined license if it fails to get the license on the first attempt and it does not have a cached license yet', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // The local fetch fails
    esClient.license.get.mockRejectedValue(new Error('Something went terribly wrong'));

    const license = await getLicenseFromLocalOrMaster(esClient);

    expect(license).toBeUndefined();
    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledTimes(1);
  });

  test('returns the license it fetches from Elasticsearch', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // The local fetch succeeds
    // @ts-expect-error it's enough to test with minimal payload
    esClient.license.get.mockResponse({ license: { type: 'basic' } });

    const license = await getLicenseFromLocalOrMaster(esClient);

    expect(license).toStrictEqual({ type: 'basic' });
    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledTimes(1);
  });

  test('after the first successful attempt, if the local request fails, it will try with the master request (failed case)', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const error = new Error('Something went terribly wrong');
    // The requests fail with an error
    esClient.license.get.mockRejectedValue(error);

    await expect(getLicenseFromLocalOrMaster(esClient)).rejects.toStrictEqual(error);

    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledWith({ local: false });
    expect(esClient.license.get).toHaveBeenCalledTimes(2);
  });

  test('after the first successful attempt, if the local request fails, it will try with the master request (success case)', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // The local fetch fails
    esClient.license.get.mockRejectedValueOnce(new Error('Something went terribly wrong'));
    // The master fetch succeeds
    // @ts-expect-error it's enough to test with minimal payload
    esClient.license.get.mockResolvedValue({ license: { type: 'basic' } });

    const license = await getLicenseFromLocalOrMaster(esClient);

    expect(license).toStrictEqual({ type: 'basic' });
    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledWith({ local: false });
    expect(esClient.license.get).toHaveBeenCalledTimes(2);
  });

  test('after the first successful attempt, if the local request fails, it will try with the master request (clearing cached license)', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // The requests fail with 400
    esClient.license.get.mockRejectedValue({ statusCode: 400 });

    // First attempt goes through 2 requests: local and master
    const license = await getLicenseFromLocalOrMaster(esClient);

    expect(license).toBeUndefined();
    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledWith({ local: false });
    expect(esClient.license.get).toHaveBeenCalledTimes(2);

    // Now the cached license is cleared, next request only goes for local and gives up when failed
    esClient.license.get.mockClear();
    await expect(getLicenseFromLocalOrMaster(esClient)).resolves.toBeUndefined();
    expect(esClient.license.get).toHaveBeenCalledWith({ local: true });
    expect(esClient.license.get).toHaveBeenCalledTimes(1);
  });
});
