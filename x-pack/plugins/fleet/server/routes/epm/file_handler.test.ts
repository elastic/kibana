/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { Headers } from 'node-fetch';

import { getBundledPackageByPkgKey } from '../../services/epm/packages/bundled_packages';
import { getFile, getInstallation } from '../../services/epm/packages/get';
import type { FleetRequestHandlerContext } from '../..';
import { appContextService } from '../../services';
import { unpackBufferEntries, getArchiveEntry } from '../../services/epm/archive';
import { getAsset } from '../../services/epm/archive/storage';

import { getFileHandler } from './file_handler';

jest.mock('../../services/app_context');
jest.mock('../../services/epm/archive');
jest.mock('../../services/epm/archive/storage');
jest.mock('../../services/epm/packages/bundled_packages');
jest.mock('../../services/epm/packages/get');

const mockedGetBundledPackageByPkgKey = jest.mocked(getBundledPackageByPkgKey);
const mockedGetInstallation = jest.mocked(getInstallation);
const mockedGetFile = jest.mocked(getFile);
const mockedGetArchiveEntry = jest.mocked(getArchiveEntry);
const mockedUnpackBufferEntries = jest.mocked(unpackBufferEntries);
const mockedGetAsset = jest.mocked(getAsset);

function mockContext() {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  return {
    fleet: {
      internalSOClient: async () => mockSavedObjectsClient,
    },
    core: {
      savedObjects: {
        client: mockSavedObjectsClient,
      },
      elasticsearch: {
        client: {
          asInternalUser: mockElasticsearchClient,
        },
      },
    },
  } as unknown as FleetRequestHandlerContext;
}

describe('getFileHandler', () => {
  beforeEach(() => {
    const logger = loggingSystemMock.createLogger();
    jest.mocked(appContextService).getLogger.mockReturnValue(logger);
    mockedGetBundledPackageByPkgKey.mockReset();
    mockedUnpackBufferEntries.mockReset();
    mockedGetFile.mockReset();
    mockedGetInstallation.mockReset();
    mockedGetArchiveEntry.mockReset();
    mockedGetAsset.mockReset();
  });

  it('should return the file for bundled package and an existing file', async () => {
    mockedGetBundledPackageByPkgKey.mockResolvedValue({} as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'README.md',
      },
    });
    const buffer = Buffer.from(`TEST`);
    mockedUnpackBufferEntries.mockResolvedValue([
      {
        path: 'test-1.0.0/README.md',
        buffer,
      },
    ]);
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();
    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 200,
        body: buffer,
        headers: expect.objectContaining({
          'content-type': 'text/markdown; charset=utf-8',
        }),
      })
    );
  });

  it('should a 404 for bundled package with a non existing file', async () => {
    mockedGetBundledPackageByPkgKey.mockResolvedValue({} as any);
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'idonotexists.md',
      },
    });
    mockedUnpackBufferEntries.mockResolvedValue([
      {
        path: 'test-1.0.0/README.md',
        buffer: Buffer.from(`TEST`),
      },
    ]);
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();
    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 404,
        body: 'bundled package file not found: idonotexists.md',
      })
    );
  });

  it('should proxy registry 200 for non bundled and non installed package', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'idonotexists.md',
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();

    mockedGetFile.mockResolvedValue({
      status: 200,
      // @ts-expect-error
      body: 'test',
      headers: new Headers({
        raw: '',
        'content-type': 'text/markdown',
      }),
    });

    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 200,
        body: 'test',
        headers: expect.objectContaining({
          'content-type': 'text/markdown',
        }),
      })
    );
  });

  it('should proxy registry 404 for non bundled and non installed package', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'idonotexists.md',
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();

    mockedGetFile.mockResolvedValue({
      status: 404,
      // @ts-expect-error
      body: 'not found',
      headers: new Headers({
        raw: '',
        'content-type': 'text',
      }),
    });

    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 404,
        body: 'not found',
        headers: expect.objectContaining({
          'content-type': 'text',
        }),
      })
    );
  });

  it('should return the file from installation for installed package', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'README.md',
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();

    mockedGetInstallation.mockResolvedValue({ version: '1.0.0' } as any);
    mockedGetArchiveEntry.mockReturnValue(Buffer.from('test'));

    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 200,
        headers: expect.objectContaining({
          'content-type': 'text/markdown; charset=utf-8',
        }),
      })
    );
  });

  it('should a 404 if the file from installation do not exists for installed package', async () => {
    const request = httpServerMock.createKibanaRequest({
      params: {
        pkgName: 'test',
        pkgVersion: '1.0.0',
        filePath: 'README.md',
      },
    });
    const response = httpServerMock.createResponseFactory();
    const context = mockContext();

    mockedGetInstallation.mockResolvedValue({ version: '1.0.0' } as any);
    await getFileHandler(context, request, response);

    expect(response.custom).toBeCalledWith(
      expect.objectContaining({
        statusCode: 404,
        body: 'installed package file not found: README.md',
      })
    );
  });
});
