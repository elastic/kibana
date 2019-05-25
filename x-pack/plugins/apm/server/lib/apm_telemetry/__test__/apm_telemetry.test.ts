/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import {
  APM_TELEMETRY_DOC_ID,
  createApmTelementry,
  storeApmTelemetry
} from '../apm_telemetry';

describe('apm_telemetry', () => {
  describe('createApmTelementry', () => {
    it('should create a ApmTelemetry object with boolean flag and frequency map of the given list of AgentNames', () => {
      const apmTelemetry = createApmTelementry([
        'go',
        'nodejs',
        'go',
        'js-base'
      ]);
      expect(apmTelemetry.has_any_services).toBe(true);
      expect(apmTelemetry.services_per_agent).toMatchObject({
        go: 2,
        nodejs: 1,
        'js-base': 1
      });
    });
    it('should ignore undefined or unknown AgentName values', () => {
      const apmTelemetry = createApmTelementry([
        'go',
        'nodejs',
        'go',
        'js-base',
        'example-platform' as any,
        undefined as any
      ]);
      expect(apmTelemetry.services_per_agent).toMatchObject({
        go: 2,
        nodejs: 1,
        'js-base': 1
      });
    });
  });

  describe('storeApmTelemetry', () => {
    let server: any;
    let apmTelemetry: SavedObjectAttributes;
    let savedObjectsClientInstance: any;

    beforeEach(() => {
      savedObjectsClientInstance = { create: jest.fn() };
      const callWithInternalUser = jest.fn();
      const internalRepository = jest.fn();
      server = {
        savedObjects: {
          SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
          getSavedObjectsRepository: jest.fn(() => internalRepository)
        },
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser }))
          }
        }
      };
      apmTelemetry = {
        has_any_services: true,
        services_per_agent: {
          go: 2,
          nodejs: 1,
          'js-base': 1
        }
      };
    });

    it('should call savedObjectsClient create with the given ApmTelemetry object', () => {
      storeApmTelemetry(server, apmTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][1]).toBe(
        apmTelemetry
      );
    });

    it('should call savedObjectsClient create with the apm-telemetry document type and ID', () => {
      storeApmTelemetry(server, apmTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][0]).toBe(
        'apm-telemetry'
      );
      expect(savedObjectsClientInstance.create.mock.calls[0][2].id).toBe(
        APM_TELEMETRY_DOC_ID
      );
    });

    it('should call savedObjectsClient create with overwrite: true', () => {
      storeApmTelemetry(server, apmTelemetry);
      expect(savedObjectsClientInstance.create.mock.calls[0][2].overwrite).toBe(
        true
      );
    });
  });
});
