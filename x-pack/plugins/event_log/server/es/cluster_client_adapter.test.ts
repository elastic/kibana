/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterClient, Logger } from '../../../../../src/core/server';
import { elasticsearchServiceMock, loggingServiceMock } from '../../../../../src/core/server/mocks';
import { ClusterClientAdapter, IClusterClientAdapter } from './cluster_client_adapter';

type EsClusterClient = Pick<jest.Mocked<ClusterClient>, 'callAsInternalUser' | 'asScoped'>;

let logger: Logger;
let clusterClient: EsClusterClient;
let clusterClientAdapter: IClusterClientAdapter;

beforeEach(() => {
  logger = loggingServiceMock.createLogger();
  clusterClient = elasticsearchServiceMock.createClusterClient();
  clusterClientAdapter = new ClusterClientAdapter({
    logger,
    clusterClient,
  });
});

describe('indexDocument', () => {
  test('should call cluster client with given doc', async () => {
    await clusterClientAdapter.indexDocument({ args: true });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('index', {
      args: true,
    });
  });

  test('should throw error when cluster client throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.indexDocument({ args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

describe('doesIlmPolicyExist', () => {
  const notFoundError = new Error('Not found') as any;
  notFoundError.statusCode = 404;

  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIlmPolicyExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '_ilm/policy/foo',
    });
  });

  test('should return false when 404 error is returned by Elasticsearch', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(notFoundError);
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when error is not 404', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIlmPolicyExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error checking existance of ilm policy: Fail"`);
  });

  test('should return true when no error is thrown', async () => {
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(true);
  });
});

describe('createIlmPolicy', () => {
  test('should call cluster client with given policy', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({ success: true });
    await clusterClientAdapter.createIlmPolicy('foo', { args: true });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('transport.request', {
      method: 'PUT',
      path: '_ilm/policy/foo',
      body: { args: true },
    });
  });

  test('should throw error when call cluster client throws', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIlmPolicy('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating ilm policy: Fail"`);
  });
});

describe('doesIndexTemplateExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIndexTemplateExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.existsTemplate', {
      name: 'foo',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue(true);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue(false);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIndexTemplateExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existance of index template: Fail"`
    );
  });
});

describe('createIndexTemplate', () => {
  test('should call cluster with given template', async () => {
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.putTemplate', {
      name: 'foo',
      create: true,
      body: { args: true },
    });
  });

  test(`should throw error if index template still doesn't exist after error is thrown`, async () => {
    clusterClient.callAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.callAsInternalUser.mockResolvedValueOnce(false);
    await expect(
      clusterClientAdapter.createIndexTemplate('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating index template: Fail"`);
  });

  test('should not throw error if index template exists after error is thrown', async () => {
    clusterClient.callAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.callAsInternalUser.mockResolvedValueOnce(true);
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
  });
});

describe('doesAliasExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesAliasExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.existsAlias', {
      name: 'foo',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.callAsInternalUser.mockResolvedValueOnce(true);
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.callAsInternalUser.mockResolvedValueOnce(false);
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesAliasExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existance of initial index: Fail"`
    );
  });
});

describe('createIndex', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.createIndex('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.create', {
      index: 'foo',
    });
  });

  test('should throw error when not getting an error of type resource_already_exists_exception', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIndex('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating initial index: Fail"`);
  });

  test(`shouldn't throw when an error of type resource_already_exists_exception is thrown`, async () => {
    const err = new Error('Already exists') as any;
    err.body = {
      error: {
        type: 'resource_already_exists_exception',
      },
    };
    clusterClient.callAsInternalUser.mockRejectedValue(err);
    await clusterClientAdapter.createIndex('foo');
  });
});
