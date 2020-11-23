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
import { AgentEventSOAttributes } from '../../../../fleet/common/types/models/agent';
import { Agent } from '../../../../fleet/common';
import * as endpointTelemetry from './index';
import * as fleetSavedObjects from './fleet_saved_objects';

describe('test security solution endpoint telemetry', () => {
  let mockSavedObjectsRepository: jest.Mocked<ISavedObjectsRepository>;
  let getFleetSavedObjectsMetadataSpy: jest.SpyInstance<Promise<SavedObjectsFindResponse<Agent>>>;
  let getLatestFleetEndpointEventSpy: jest.SpyInstance<
    Promise<SavedObjectsFindResponse<AgentEventSOAttributes>>
  >;

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

  describe('when a request for endpoint agents fails', () => {
    it('should return an empty object', async () => {
      getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
        Promise.reject(Error('No agents for you'))
      );

      const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsRepository
      );
      expect(getFleetSavedObjectsMetadataSpy).toHaveBeenCalled();
      expect(endpointUsage).toEqual({});
    });
  });

  describe('when an agent has not been installed', () => {
    it('should return the default shape if no agents are found', async () => {
      getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
        Promise.resolve({ saved_objects: [], total: 0, per_page: 0, page: 0 })
      );

      const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsRepository
      );
      expect(getFleetSavedObjectsMetadataSpy).toHaveBeenCalled();
      expect(endpointUsage).toEqual({
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

  describe('when agent(s) have been installed', () => {
    describe('when a request for events has failed', () => {
      it('should show only one endpoint installed but it is inactive', async () => {
        getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.reject(Error('No events for you'))
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsRepository
        );
        expect(endpointUsage).toEqual({
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
              failure: 0,
              active: 0,
              inactive: 0,
            },
          },
        });
      });
    });

    describe('when a request for events is successful', () => {
      it('should show one endpoint installed but endpoint has failed to run', async () => {
        getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse())
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsRepository
        );
        expect(endpointUsage).toEqual({
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
              failure: 0,
              active: 0,
              inactive: 0,
            },
          },
        });
      });

      it('should show two endpoints installed but both endpoints have failed to run', async () => {
        getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse(false))
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse())
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsRepository
        );
        expect(endpointUsage).toEqual({
          total_installed: 2,
          active_within_last_24_hours: 0,
          os: [
            {
              full_name: MockOSFullName,
              platform: MockOSPlatform,
              version: MockOSVersion,
              count: 2,
            },
          ],
          policies: {
            malware: {
              failure: 0,
              active: 0,
              inactive: 0,
            },
          },
        });
      });

      it('should show two endpoints installed but agents have not checked in within past day', async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoISOString = twoDaysAgo.toISOString();

        getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse(false, twoDaysAgoISOString))
        );
        getLatestFleetEndpointEventSpy.mockImplementation(
          () => Promise.resolve(mockFleetEventsObjectsResponse(true, twoDaysAgoISOString)) // agent_id doesn't matter for mock here
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsRepository
        );
        expect(endpointUsage).toEqual({
          total_installed: 2,
          active_within_last_24_hours: 0,
          os: [
            {
              full_name: MockOSFullName,
              platform: MockOSPlatform,
              version: MockOSVersion,
              count: 2,
            },
          ],
          policies: {
            malware: {
              failure: 0,
              active: 2,
              inactive: 0,
            },
          },
        });
      });

      it('should show one endpoint installed and endpoint is running', async () => {
        getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse(true))
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsRepository
        );
        expect(endpointUsage).toEqual({
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

      describe('malware policy', () => {
        it('should have failed to enable', async () => {
          getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(
              mockFleetEventsObjectsResponse(true, new Date().toISOString(), 'failure')
            )
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsRepository
          );
          expect(endpointUsage).toEqual({
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
                failure: 1,
                active: 0,
                inactive: 0,
              },
            },
          });
        });

        it('should be enabled successfully', async () => {
          getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(mockFleetEventsObjectsResponse(true))
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsRepository
          );
          expect(endpointUsage).toEqual({
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

        it('should be disabled successfully', async () => {
          getFleetSavedObjectsMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(
              mockFleetEventsObjectsResponse(true, new Date().toISOString(), 'success', 'off')
            )
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsRepository
          );
          expect(endpointUsage).toEqual({
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
                active: 0,
                inactive: 1,
              },
            },
          });
        });
      });
    });
  });
});
