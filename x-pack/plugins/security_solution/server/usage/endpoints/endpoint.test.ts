/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import {
  mockFleetObjectsResponse,
  mockFleetEventsObjectsResponse,
  MockOSFullName,
  MockOSPlatform,
  MockOSVersion,
} from './endpoint.mocks';
import { ISavedObjectsRepository, SavedObjectsFindResponse } from 'src/core/server';
import { AgentEventSOAttributes } from '../../../../ingest_manager/common/types/models/agent';
import { Agent } from '../../../../ingest_manager/common';
import * as endpointTelemetry from './index';
import * as fleetSavedObjects from './fleet_saved_objects';

describe('test security solution endpoint telemetry', () => {
  let mockSavedObjectsRepository: jest.Mocked<ISavedObjectsRepository>;
  let getFleetSavedObjectsMetadataSpy: jest.SpyInstance<Promise<SavedObjectsFindResponse<Agent>>>;
  let getLatestFleetEndpointEventSpy: jest.SpyInstance<Promise<
    SavedObjectsFindResponse<AgentEventSOAttributes>
  >>;

  beforeAll(() => {
    getLatestFleetEndpointEventSpy = jest.spyOn(fleetSavedObjects, 'getLatestFleetEndpointEvent');
    getFleetSavedObjectsMetadataSpy = jest.spyOn(fleetSavedObjects, 'getFleetSavedObjectsMetadata');
    mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should have a default shape', () => {
    expect(endpointTelemetry.getDefaultEndpointTelemetry()).toMatchInlineSnapshot(`
      Object {
        "active_within_last_24_hours": 0,
        "os": Array [],
        "policies": Object {
          "malware": Object {
            "active": 0,
            "failure": 0,
            "inactive": 0,
          },
        },
        "total_installed": 0,
      }
    `);
  });

  describe('when an agent has not been installed', () => {
    it('should return the default shape if no agents are found', async () => {
      getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
        Promise.resolve({ saved_objects: [], total: 0, per_page: 0, page: 0 })
      );

      const emptyEndpointTelemetryData = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsRepository
      );
      expect(getFleetSavedObjectsMetadataSpy).toHaveBeenCalled();
      expect(emptyEndpointTelemetryData).toEqual({
        total_installed: 0,
        active_within_last_24_hours: 0,
        os: [],
        policies: {
          malware: {
            failure: 0,
            active: 0,
            inactive: 0,
          },
        },
      });
    });
  });

  describe('when an agent has been installed', () => {
    it('should show one enpoint installed but it is inactive', async () => {
      getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
        Promise.resolve(mockFleetObjectsResponse())
      );
      getLatestFleetEndpointEventSpy.mockImplementation(() =>
        Promise.resolve(mockFleetEventsObjectsResponse())
      );

      const emptyEndpointTelemetryData = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsRepository
      );
      expect(emptyEndpointTelemetryData).toEqual({
        total_installed: 1,
        active_within_last_24_hours: 0,
        os: [
          {
            full_name: MockOSFullName,
            platform: MockOSPlatform,
            version: MockOSVersion,
            count: 1,
          },
        ],
        policies: {
          malware: {
            failure: 1,
            active: 0,
            inactive: 0,
          },
        },
      });
    });

    it('should show one endpoint installed and it is active', async () => {
      getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
        Promise.resolve(mockFleetObjectsResponse())
      );
      getLatestFleetEndpointEventSpy.mockImplementation(() =>
        Promise.resolve(mockFleetEventsObjectsResponse(true))
      );

      const emptyEndpointTelemetryData = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsRepository
      );
      expect(emptyEndpointTelemetryData).toEqual({
        total_installed: 1,
        active_within_last_24_hours: 1,
        os: [
          {
            full_name: MockOSFullName,
            platform: MockOSPlatform,
            version: MockOSVersion,
            count: 1,
          },
        ],
        policies: {
          malware: {
            failure: 0,
            active: 1,
            inactive: 0,
          },
        },
      });
    });
  });
});
