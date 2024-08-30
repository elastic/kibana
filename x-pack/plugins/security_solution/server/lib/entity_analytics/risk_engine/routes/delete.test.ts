/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from "@kbn/task-manager-plugin/server/mocks";
import { RISK_ENGINE_INSTALLATION_AND_DATA_CLEANUP_URL } from "../../../../../common/constants";
import {
  serverMock,
  requestContextMock,
  requestMock,
} from "../../../detection_engine/routes/__mocks__";
import { riskEngineDataClientMock } from "../risk_engine_data_client.mock";

describe("risk engine cleanup route", () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockRiskEngineDataClient: ReturnType<
    typeof riskEngineDataClientMock.create
  >;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    context = requestContextMock.convertContext(
      requestContextMock.create({
        ...clients,
        riskEngineDataClient: mockRiskEngineDataClient,
      })
    );
    mockTaskManagerStart = taskManagerMock.createStart();
  });

  const buildRequest = () => {
    return requestMock.create({
      method: "delete",
      path: RISK_ENGINE_INSTALLATION_AND_DATA_CLEANUP_URL,
      body: {},
    });
  };
  describe("invokes the risk engine cleanup route", () => {
    it("should call the router with the correct route and handler", async () => {
      const request = buildRequest();
      await server.inject(request, context);
      expect(mockRiskEngineDataClient.tearDown).toHaveBeenCalled();
    });
  });

  // it('should return a 403 response if the user does not have the required privilege', async () => {
  //     const router = {
  //         delete: jest.fn(),
  //     };

  //     const getStartServices = jest.fn().mockResolvedValue([{ savedObjects: {} }, {}, {}]);

  //     const handler = riskEngineCleanupRoute(router, getStartServices);

  //     const request = {
  //         headers: {},
  //     };

  //     const response = await handler(request);

  //     expect(response.status).toBe(403);
  //     expect(response.payload).toEqual({
  //         message: 'User does not have the required privilege to perform this action.',
  //     });
  // });

  // it('should return a 500 response if the task manager is unavailable', async () => {
  //     const router = {
  //         delete: jest.fn(),
  //     };

  //     const getStartServices = jest.fn().mockResolvedValue([{ savedObjects: {} }, {}, {}]);

  //     const handler = riskEngineCleanupRoute(router, getStartServices);

  //     const request = {
  //         headers: {
  //             authorization: 'Bearer token',
  //         },
  //     };

  //     const response = await handler(request);

  //     expect(response.status).toBe(500);
  //     expect(response.payload).toEqual({
  //         message: 'Task manager is unavailable. Please try again later.',
  //     });
  // });

  // // Add more test cases here...
});
