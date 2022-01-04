/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';

import { appContextService } from './app_context';
import { getCloudFleetServersHosts, settingsSetup } from './settings';

jest.mock('./app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('getCloudFleetServersHosts', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
  });
  it('should return undefined if cloud is not setup', () => {
    expect(getCloudFleetServersHosts()).toBeUndefined();
  });

  it('should return fleet server hosts if cloud is correctly setup with default port == 443', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.us-east-1.aws.found.io",
      ]
    `);
  });

  it('should return fleet server hosts if cloud is correctly setup with a default port', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'test:dGVzdC5mcjo5MjQzJGRhM2I2YjNkYWY5ZDRjODE4ZjI4ZmEzNDdjMzgzODViJDgxMmY4NWMxZjNjZTQ2YTliYjgxZjFjMWIxMzRjNmRl',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.test.fr:9243",
      ]
    `);
  });
});

describe('settingsSetup', () => {
  afterEach(() => {
    mockedAppContextService.getCloud.mockReset();
  });
  it('should create settings if there is no settings', async () => {
    const soRepoMock = savedObjectsRepositoryMock.create();

    soRepoMock.find.mockResolvedValue({
      total: 0,
      page: 0,
      per_page: 10,
      saved_objects: [],
    });

    soRepoMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soRepoMock);

    expect(soRepoMock.create).toBeCalled();
  });

  it('should do nothing if there is settings and no default fleet server hosts', async () => {
    const soRepoMock = savedObjectsRepositoryMock.create();

    soRepoMock.find.mockResolvedValue({
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

    soRepoMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soRepoMock);

    expect(soRepoMock.create).not.toBeCalled();
  });

  it('should update settings if there is settings without fleet server hosts and default fleet server hosts', async () => {
    const soRepoMock = savedObjectsRepositoryMock.create();
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'test:dGVzdC5mcjo5MjQzJGRhM2I2YjNkYWY5ZDRjODE4ZjI4ZmEzNDdjMzgzODViJDgxMmY4NWMxZjNjZTQ2YTliYjgxZjFjMWIxMzRjNmRl',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    soRepoMock.find.mockResolvedValue({
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

    soRepoMock.update.mockResolvedValue({
      id: 'updated',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    soRepoMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soRepoMock);

    expect(soRepoMock.create).not.toBeCalled();
    expect(soRepoMock.update).toBeCalledWith('ingest_manager_settings', 'defaultsettings', {
      fleet_server_hosts: ['https://deployment-id-1.fleet.test.fr:9243'],
    });
  });

  it('should not update settings if there is settings with fleet server hosts and default fleet server hosts', async () => {
    const soRepoMock = savedObjectsRepositoryMock.create();
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'test:dGVzdC5mcjo5MjQzJGRhM2I2YjNkYWY5ZDRjODE4ZjI4ZmEzNDdjMzgzODViJDgxMmY4NWMxZjNjZTQ2YTliYjgxZjFjMWIxMzRjNmRl',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    soRepoMock.find.mockResolvedValue({
      total: 1,
      page: 0,
      per_page: 10,
      saved_objects: [
        {
          id: 'defaultsettings',
          attributes: {
            fleet_server_hosts: ['http://fleetserver:1234'],
          },
          type: 'so_type',
          references: [],
          score: 0,
        },
      ],
    });

    soRepoMock.update.mockResolvedValue({
      id: 'updated',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    soRepoMock.create.mockResolvedValue({
      id: 'created',
      attributes: {},
      references: [],
      type: 'so_type',
    });

    await settingsSetup(soRepoMock);

    expect(soRepoMock.create).not.toBeCalled();
    expect(soRepoMock.update).not.toBeCalled();
  });
});
