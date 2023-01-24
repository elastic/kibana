/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from './app_context';
import { settingsSetup } from './settings';

jest.mock('./app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('settingsSetup', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
    mockedAppContextService.getConfig.mockReset();
  });
  it('should create settings if there is no settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 0,
      page: 0,
      per_page: 10,
      saved_objects: [],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).toBeCalled();
  });

  it('should do nothing if there is settings', async () => {
    const soClientMock = savedObjectsClientMock.create();

    soClientMock.find.mockResolvedValue({
      total: 1,
      page: 0,
      per_page: 10,
      saved_objects: [
        {
          id: 'defaultsettings',
          attributes: {},
          type: 'so_type',
          references: [],
          score: 0,
        },
      ],
    });

    soClientMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soClientMock);

    expect(soClientMock.create).not.toBeCalled();
  });
});
