/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createMlTelemetry,
  incrementFileDataVisualizerIndexCreationCount,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  storeMlTelemetry,
} from './ml_telemetry';

describe('ml_telemetry', () => {
  describe('createMlTelemetry', () => {
    it('should create a MlTelemetry object', () => {
      const mlTelemetry = createMlTelemetry(1);
      expect(mlTelemetry.file_data_visualizer.index_creation_count).toBe(1);
    });
    it('should ignore undefined or unknown values', () => {
      const mlTelemetry = createMlTelemetry(undefined);
      expect(mlTelemetry.file_data_visualizer.index_creation_count).toBe(0);
    });
  });

  describe('storeMlTelemetry', () => {
    let mlTelemetry: MlTelemetry;
    let internalRepository: any;

    beforeEach(() => {
      internalRepository = { create: jest.fn(), get: jest.fn() };
      mlTelemetry = {
        file_data_visualizer: {
          index_creation_count: 1,
        },
      };
    });

    it('should call internalRepository create with the given MlTelemetry object', () => {
      storeMlTelemetry(internalRepository, mlTelemetry);
      expect(internalRepository.create.mock.calls[0][1]).toBe(mlTelemetry);
    });

    it('should call internalRepository create with the ml-telemetry document type and ID', () => {
      storeMlTelemetry(internalRepository, mlTelemetry);
      expect(internalRepository.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(internalRepository.create.mock.calls[0][2].id).toBe(ML_TELEMETRY_DOC_ID);
    });

    it('should call internalRepository create with overwrite: true', () => {
      storeMlTelemetry(internalRepository, mlTelemetry);
      expect(internalRepository.create.mock.calls[0][2].overwrite).toBe(true);
    });
  });

  describe('incrementFileDataVisualizerIndexCreationCount', () => {
    let savedObjectsClient: any;

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
                  enabled: telemetryEnabled,
                },
              };
            case 'ml-telemetry':
              // emulate that a non-existing saved object will throw an error
              if (indexCreationCount === undefined) {
                throw Error;
              }
              return {
                attributes: {
                  file_data_visualizer: {
                    index_creation_count: indexCreationCount,
                  },
                },
              };
          }
        }),
      };
    }

    function mockInit(telemetryEnabled?: boolean, indexCreationCount?: number): void {
      savedObjectsClient = createSavedObjectsClientInstance(telemetryEnabled, indexCreationCount);
    }

    it('should not increment if telemetry status cannot be determined', async () => {
      mockInit();
      await incrementFileDataVisualizerIndexCreationCount(savedObjectsClient);

      expect(savedObjectsClient.create.mock.calls).toHaveLength(0);
    });

    it('should not increment if telemetry status is disabled', async () => {
      mockInit(false);
      await incrementFileDataVisualizerIndexCreationCount(savedObjectsClient);

      expect(savedObjectsClient.create.mock.calls).toHaveLength(0);
    });

    it('should initialize index_creation_count with 1', async () => {
      mockInit(true);
      await incrementFileDataVisualizerIndexCreationCount(savedObjectsClient);

      expect(savedObjectsClient.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClient.create.mock.calls[0][1]).toEqual({
        file_data_visualizer: { index_creation_count: 1 },
      });
    });

    it('should increment index_creation_count to 2', async () => {
      mockInit(true, 1);
      await incrementFileDataVisualizerIndexCreationCount(savedObjectsClient);

      expect(savedObjectsClient.create.mock.calls[0][0]).toBe('ml-telemetry');
      expect(savedObjectsClient.create.mock.calls[0][1]).toEqual({
        file_data_visualizer: { index_creation_count: 2 },
      });
    });
  });
});
