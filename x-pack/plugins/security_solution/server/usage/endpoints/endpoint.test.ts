/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import {
  mockFleetObjectsResponse,
  mockFleetEventsObjectsResponse,
  MockOSFullName,
  MockOSPlatform,
  MockOSVersion,
} from './endpoint.mocks';
import { SavedObjectsClientContract, SavedObjectsFindResponse } from 'src/core/server';
import { Agent } from '../../../../fleet/common';
import * as endpointTelemetry from './index';
import * as fleetSavedObjects from './fleet_saved_objects';
import { createMockEndpointAppContext } from '../../endpoint/mocks';
import { EndpointAppContext } from '../../endpoint/types';

describe('test security solution endpoint telemetry', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockEndpointAppContext: EndpointAppContext;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let getEndpointIntegratedFleetMetadataSpy: jest.SpyInstance<
    Promise<{ agents: Agent[]; total: number; page: number; perPage: number } | undefined>
  >;
  let getLatestFleetEndpointEventSpy: jest.SpyInstance<Promise<SavedObjectsFindResponse>>;

  beforeAll(() => {
    getLatestFleetEndpointEventSpy = jest.spyOn(fleetSavedObjects, 'getLatestFleetEndpointEvent');
    getEndpointIntegratedFleetMetadataSpy = jest.spyOn(
      fleetSavedObjects,
      'getEndpointIntegratedFleetMetadata'
    );
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockEndpointAppContext = createMockEndpointAppContext();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
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
      getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
        Promise.reject(Error('No agents for you'))
      );

      const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsClient,
        mockEndpointAppContext,
        mockEsClient
      );
      expect(getEndpointIntegratedFleetMetadataSpy).toHaveBeenCalled();
      expect(endpointUsage).toEqual({});
    });
  });

  describe('when an agent has not been installed', () => {
    it('should return the default shape if no agents are found', async () => {
      getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
        Promise.resolve({ agents: [], total: 0, perPage: 0, page: 0 })
      );

      const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
        mockSavedObjectsClient,
        mockEndpointAppContext,
        mockEsClient
      );
      expect(getEndpointIntegratedFleetMetadataSpy).toHaveBeenCalled();
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
        getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.reject(Error('No events for you'))
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsClient,
          mockEndpointAppContext,
          mockEsClient
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
        getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse())
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsClient,
          mockEndpointAppContext,
          mockEsClient
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
        getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse(false))
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse())
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsClient,
          mockEndpointAppContext,
          mockEsClient
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

        getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse(false, twoDaysAgoISOString))
        );
        getLatestFleetEndpointEventSpy.mockImplementation(
          () => Promise.resolve(mockFleetEventsObjectsResponse(true, twoDaysAgoISOString)) // agent_id doesn't matter for mock here
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsClient,
          mockEndpointAppContext,
          mockEsClient
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
        getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
          Promise.resolve(mockFleetObjectsResponse())
        );
        getLatestFleetEndpointEventSpy.mockImplementation(() =>
          Promise.resolve(mockFleetEventsObjectsResponse(true))
        );

        const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
          mockSavedObjectsClient,
          mockEndpointAppContext,
          mockEsClient
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
          getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(
              mockFleetEventsObjectsResponse(true, new Date().toISOString(), 'failure')
            )
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsClient,
            mockEndpointAppContext,
            mockEsClient
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
          getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(mockFleetEventsObjectsResponse(true))
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsClient,
            mockEndpointAppContext,
            mockEsClient
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
          getEndpointIntegratedFleetMetadataSpy.mockImplementation(() =>
            Promise.resolve(mockFleetObjectsResponse())
          );
          getLatestFleetEndpointEventSpy.mockImplementation(() =>
            Promise.resolve(
              mockFleetEventsObjectsResponse(true, new Date().toISOString(), 'success', 'off')
            )
          );

          const endpointUsage = await endpointTelemetry.getEndpointTelemetryFromFleet(
            mockSavedObjectsClient,
            mockEndpointAppContext,
            mockEsClient
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
