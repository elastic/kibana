/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMlTelemetry,
  getSavedObjectsClient,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  storeMlTelemetry,
} from './ml_telemetry';

describe('ml_telemetry', () => {
  describe('createMlTelemetry', () => {
    it('should create a MlTelemetry object', () => {
      const mlTelemetry = createMlTelemetry(1);
      expect(mlTelemetry.file_data_visualizer_index_creation_count).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const mlTelemetry = createMlTelemetry(undefined);
      expect(mlTelemetry.file_data_visualizer_index_creation_count).toBe(0);
    });
  });

  describe('storeMlTelemetry', () => {
    let server: any;
    let mlTelemetry: MlTelemetry;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      const callWithInternalUser = jest.fn();
      const internalRepository = jest.fn();
      server = {
        savedObjects: {
          SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
          getSavedObjectsRepository: jest.fn(() => internalRepository),
        },
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser })),
          },
        },
      };
      mlTelemetry = {
        file_data_visualizer_index_creation_count: 1,
      };
    });

    it('should call savedObjectsClient create with the given ApmTelemetry object', () => {
      storeMlTelemetry(server, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(mlTelemetry);
    });

    it('should call savedObjectsClient create with the ml-telemetry document type and ID', () => {
      storeMlTelemetry(server, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(ML_TELEMETRY_DOC_ID);
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeMlTelemetry(server, mlTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][2].overwrite).toBe(true);
    });
  });

  describe('getSavedObjectsClient', () => {
    let server: any;
    let savedObjectsClientInstance: any;
    let callWithInternalUser: any;
    let internalRepository: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      callWithInternalUser = jest.fn();
      internalRepository = jest.fn();
      server = {
        savedObjects: {
          SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
          getSavedObjectsRepository: jest.fn(() => internalRepository),
        },
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser })),
          },
        },
      };
    });

    it('should use internal user "admin"', () => {
      getSavedObjectsClient(server);

      expect(server.plugins.elasticsearch.getCluster).toHaveBeenCalledWith('admin');
    });

    it('should call getSavedObjectsRepository with a cluster using the internal user context', () => {
      getSavedObjectsClient(server);

      expect(server.savedObjects.getSavedObjectsRepository).toHaveBeenCalledWith(
        callWithInternalUser
      );
    });

    it('should return a SavedObjectsClient initialized with the saved objects internal repository', () => {
      const result = getSavedObjectsClient(server);

      expect(result).toBe(savedObjectsClientInstance);
      expect(server.savedObjects.SavedObjectsClient).toHaveBeenCalledWith(internalRepository);
    });
  });
});
