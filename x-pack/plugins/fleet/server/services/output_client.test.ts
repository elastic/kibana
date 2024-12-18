/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { createFleetAuthzMock } from '../../common/mocks';

import { OutputClient } from './output_client';
import { outputService } from './output';

jest.mock('./output');

const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

describe('OutputClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultDataOutputId()', () => {
    it('should call output service `getDefaultDataOutputId()` method', async () => {
      const soClient = savedObjectsClientMock.create();
      const authz = createFleetAuthzMock();
      const outputClient = new OutputClient(soClient, authz);
      await outputClient.getDefaultDataOutputId();

      expect(mockedOutputService.getDefaultDataOutputId).toHaveBeenCalledWith(soClient);
    });

    it('should throw error when no `fleet.readSettings` and no `fleet.readAgentPolicies` privileges', async () => {
      const soClient = savedObjectsClientMock.create();
      const authz = createFleetAuthzMock();
      authz.fleet.readSettings = false;
      authz.fleet.readAgentPolicies = false;
      const outputClient = new OutputClient(soClient, authz);

      await expect(outputClient.getDefaultDataOutputId()).rejects.toMatchInlineSnapshot(
        `[OutputUnauthorizedError]`
      );
      expect(mockedOutputService.getDefaultDataOutputId).not.toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('should call output service `get()` method', async () => {
      const soClient = savedObjectsClientMock.create();
      const authz = createFleetAuthzMock();
      const outputClient = new OutputClient(soClient, authz);
      await outputClient.get('default');

      expect(mockedOutputService.get).toHaveBeenCalledWith(soClient, 'default');
    });

    it('should throw error when no `fleet.readSettings` and no `fleet.readAgentPolicies` privileges', async () => {
      const soClient = savedObjectsClientMock.create();
      const authz = createFleetAuthzMock();
      authz.fleet.readSettings = false;
      authz.fleet.readAgentPolicies = false;
      const outputClient = new OutputClient(soClient, authz);

      await expect(outputClient.get('default')).rejects.toMatchInlineSnapshot(
        `[OutputUnauthorizedError]`
      );
      expect(mockedOutputService.get).not.toHaveBeenCalled();
    });
  });
});
