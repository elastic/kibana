/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from 'src/server/saved_objects/service/saved_objects_client';
import {
  AgentName,
  APM_TELEMETRY_DOC_ID,
  createApmTelementry,
  getSavedObjectsClient,
  storeApmTelemetry
} from '../apm_telemetry';

describe('apm_telemetry', () => {
  describe('createApmTelementry', () => {
    it('should create a ApmTelemetry object with boolean flag and frequency map of the given list of AgentNames', () => {
      const apmTelemetry = createApmTelementry([
        AgentName.GoLang,
        AgentName.NodeJs,
        AgentName.GoLang,
        AgentName.JsBase
      ]);
      expect(apmTelemetry.has_any_services).toBe(true);
      expect(apmTelemetry.services_per_agent).toMatchObject({
        [AgentName.GoLang]: 2,
        [AgentName.NodeJs]: 1,
        [AgentName.JsBase]: 1
      });
    });
    it('should ignore undefined or unknown AgentName values', () => {
      const apmTelemetry = createApmTelementry([
        AgentName.GoLang,
        AgentName.NodeJs,
        AgentName.GoLang,
        AgentName.JsBase,
        'example-platform' as any,
        undefined as any
      ]);
      expect(apmTelemetry.services_per_agent).toMatchObject({
        [AgentName.GoLang]: 2,
        [AgentName.NodeJs]: 1,
        [AgentName.JsBase]: 1
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
          [AgentName.GoLang]: 2,
          [AgentName.NodeJs]: 1,
          [AgentName.JsBase]: 1
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
          getSavedObjectsRepository: jest.fn(() => internalRepository)
        },
        plugins: {
          elasticsearch: {
            getCluster: jest.fn(() => ({ callWithInternalUser }))
          }
        }
      };
    });

    it('should use internal user "admin"', () => {
      getSavedObjectsClient(server);

      expect(server.plugins.elasticsearch.getCluster).toHaveBeenCalledWith(
        'admin'
      );
    });

    it('should call getSavedObjectsRepository with a cluster using the internal user context', () => {
      getSavedObjectsClient(server);

      expect(
        server.savedObjects.getSavedObjectsRepository
      ).toHaveBeenCalledWith(callWithInternalUser);
    });

    it('should return a SavedObjectsClient initialized with the saved objects internal repository', () => {
      const result = getSavedObjectsClient(server);

      expect(result).toBe(savedObjectsClientInstance);
      expect(server.savedObjects.SavedObjectsClient).toHaveBeenCalledWith(
        internalRepository
      );
    });
  });
});
