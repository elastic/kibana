/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { SPACES_TELEMETRY_TYPE } from '../../constants';
import { SpacesTelemetry } from '../../model/spaces_telemetry';
import { CopyOptions, ResolveConflictsOptions } from '../copy_to_spaces/types';
import { TelemetryClient } from './telemetry_client';

describe('TelemetryClient', () => {
  const setup = () => {
    const debugLoggerMock = jest.fn();
    const repositoryMock = savedObjectsRepositoryMock.create();
    const telemetryClient = new TelemetryClient(debugLoggerMock, repositoryMock);
    return { telemetryClient, debugLoggerMock, repositoryMock };
  };

  const createMockData = (attributes: SpacesTelemetry) => ({
    id: SPACES_TELEMETRY_TYPE,
    type: SPACES_TELEMETRY_TYPE,
    attributes,
    references: [],
  });

  const createOptions = { overwrite: true, id: SPACES_TELEMETRY_TYPE };

  // mock data for existing fields
  const copySavedObjects = {
    total: 5,
    createNewCopies: { enabled: 2, disabled: 3 },
    overwrite: { enabled: 1, disabled: 4 },
  };
  const resolveCopySavedObjectsErrors = {
    total: 13,
    createNewCopies: { enabled: 6, disabled: 7 },
  };

  describe('#getTelemetryData', () => {
    it('returns empty object when encountering a repository error', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockRejectedValue(new Error('Oh no!'));

      const result = await telemetryClient.getTelemetryData();
      expect(result).toEqual({});
    });

    it('returns object attributes when telemetry data exists', async () => {
      const { telemetryClient, repositoryMock } = setup();
      const attributes = { foo: 'bar' } as SpacesTelemetry;
      repositoryMock.get.mockResolvedValue(createMockData(attributes));

      const result = await telemetryClient.getTelemetryData();
      expect(result).toEqual(attributes);
    });
  });

  describe('#incrementCopySavedObjects', () => {
    it('creates fields if attributes are empty', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await telemetryClient.incrementCopySavedObjects({} as CopyOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_TELEMETRY_TYPE,
        {
          apiCalls: {
            copySavedObjects: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
              overwrite: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true / overwrite=true appropriately', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await telemetryClient.incrementCopySavedObjects({
        createNewCopies: true,
        overwrite: true,
      } as CopyOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_TELEMETRY_TYPE,
        {
          apiCalls: {
            // these fields are changed
            copySavedObjects: {
              total: copySavedObjects.total + 1,
              createNewCopies: {
                enabled: copySavedObjects.createNewCopies.enabled + 1,
                disabled: copySavedObjects.createNewCopies.disabled,
              },
              overwrite: {
                enabled: copySavedObjects.overwrite.enabled + 1,
                disabled: copySavedObjects.overwrite.disabled,
              },
            },
            // these fields are unchanged
            resolveCopySavedObjectsErrors,
          },
        },
        createOptions
      );
    });
  });

  describe('#incrementResolveCopySavedObjectsErrors', () => {
    it('creates fields if attributes are empty', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(createMockData({}));

      await telemetryClient.incrementResolveCopySavedObjectsErrors({} as ResolveConflictsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_TELEMETRY_TYPE,
        {
          apiCalls: {
            resolveCopySavedObjectsErrors: {
              total: 1,
              createNewCopies: { enabled: 0, disabled: 1 },
            },
          },
        },
        createOptions
      );
    });

    it('increments existing fields, leaves other fields unchanged, and handles createNewCopies=true appropriately', async () => {
      const { telemetryClient, repositoryMock } = setup();
      repositoryMock.get.mockResolvedValue(
        createMockData({ apiCalls: { copySavedObjects, resolveCopySavedObjectsErrors } })
      );

      await telemetryClient.incrementResolveCopySavedObjectsErrors({
        createNewCopies: true,
      } as ResolveConflictsOptions);
      expect(repositoryMock.create).toHaveBeenCalledWith(
        SPACES_TELEMETRY_TYPE,
        {
          apiCalls: {
            // these fields are changed
            resolveCopySavedObjectsErrors: {
              total: resolveCopySavedObjectsErrors.total + 1,
              createNewCopies: {
                enabled: resolveCopySavedObjectsErrors.createNewCopies.enabled + 1,
                disabled: resolveCopySavedObjectsErrors.createNewCopies.disabled,
              },
            },
            // these fields are unchanged
            copySavedObjects,
          },
        },
        createOptions
      );
    });
  });
});
