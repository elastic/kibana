/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createTelemetry,
  getSavedObjectsClient,
  incrementFileDataVisualizerIndexCreationCount,
  storeTelemetry,
  Telemetry,
  TELEMETRY_DOC_ID,
} from './telemetry';

describe('file_upload_telemetry', () => {
  describe('createTelemetry', () => {
    it('should create a file upload telemetry object', () => {
      const fileUploadTelemetry = createTelemetry(1);
      expect(fileUploadTelemetry.file_upload.index_creation_count).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const fileUploadTelemetry = createTelemetry(undefined);
      expect(fileUploadTelemetry.file_upload.index_creation_count).toBe(0);
    });
  });

  describe('storeTelemetry', () => {
    let server: any;
    let fileUploadTelemetry: Telemetry;
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
      fileUploadTelemetry = {
        file_upload: {
          index_creation_count: 1,
        },
      };
    });

    it('should call savedObjectsClient create with the given Telemetry object', () => {
      storeTelemetry(server, fileUploadTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(fileUploadTelemetry);
    });

    it('should call savedObjectsClient create with the file-upload-telemetry document type and ID', () => {
      storeTelemetry(server, fileUploadTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('file-upload-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(TELEMETRY_DOC_ID);
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeTelemetry(server, fileUploadTelemetry);
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

    it('should return a SavedObjectsClient initialized with the saved objects internal repository', () => {
      const result = getSavedObjectsClient(server);

      expect(result).toBe(savedObjectsClientInstance);
      expect(server.savedObjects.SavedObjectsClient).toHaveBeenCalledWith(internalRepository);
    });
  });

  describe('incrementFileImportCount', () => {
    let server: any;
    let savedObjectsClientInstance: any;
    let callWithInternalUser: any;
    let internalRepository: any;

    function createSavedObjectsClientInstance(
      telemetryEnabled?: boolean,
      indexCreationCount?: number
    ) {
      return {
        create: jest.fn(),
        get: jest.fn(obj => {
          switch (obj) {
            case 'telemetry':
              if (telemetryEnabled === undefined) {
                throw Error;
              }
              return {
                attributes: {
                  import_telemetry: {
                    enabled: telemetryEnabled,
                  },
                },
              };
            case 'file-upload-telemetry':
              // emulate that a non-existing saved object will throw an error
              if (indexCreationCount === undefined) {
                throw Error;
              }
              return {
                file_upload: {
                  index_creation_count: indexCreationCount,
                },
              };
          }
        }),
      };
    }

    function mockInit(telemetryEnabled?: boolean, indexCreationCount?: number): void {
      savedObjectsClientInstance = createSavedObjectsClientInstance(
        telemetryEnabled,
        indexCreationCount
      );
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
    }

    it('should not increment if telemetry status cannot be determined', async () => {
      mockInit();
      await incrementFileDataVisualizerIndexCreationCount(server);

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should not increment if telemetry status is disabled', async () => {
      mockInit(false);
      await incrementFileDataVisualizerIndexCreationCount(server);

      expect(savedObjectsClientInstance.create.mock.calls).toHaveLength(0);
    });

    it('should initialize index_creation_count with 1', async () => {
      mockInit(true);
      await incrementFileDataVisualizerIndexCreationCount(server);

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('file-upload-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        file_upload: { index_creation_count: 1 },
      });
    });

    it('should increment index_creation_count to 2', async () => {
      mockInit(true, 1);
      await incrementFileDataVisualizerIndexCreationCount(server);

      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe('file-upload-telemetry');
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toEqual({
        file_upload: { index_creation_count: 2 },
      });
    });
  });
});
