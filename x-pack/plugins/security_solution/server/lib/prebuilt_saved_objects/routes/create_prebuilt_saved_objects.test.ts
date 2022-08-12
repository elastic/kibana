/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { PREBUILT_SAVED_OBJECTS_BULK_CREATE } from '../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  mockGetCurrentUser,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { getEmptySavedObjectsResponse } from '../../detection_engine/routes/__mocks__/request_responses';
import { createPrebuiltSavedObjectsRoute } from './create_prebuilt_saved_objects';

const createPrebuiltSavedObjectsRequest = (savedObjectTemplate: string) =>
  requestMock.create({
    method: 'post',
    path: PREBUILT_SAVED_OBJECTS_BULK_CREATE,
    params: { template_name: savedObjectTemplate },
  });

describe('createPrebuiltSavedObjects', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    clients.savedObjectsClient.bulkCreate.mockResolvedValue(getEmptySavedObjectsResponse()); // rule status request

    createPrebuiltSavedObjectsRoute(server.router, securitySetup);
  });

  it.each([['hostRiskScoreDashboards', 'userRiskScoreDashboards']])(
    'should create saved objects from given template - %p',
    async () => {
      const response = await server.inject(
        createPrebuiltSavedObjectsRequest('userRiskScoreDashboards'),
        requestContextMock.convertContext(context)
      );

      expect(clients.savedObjectsClient.bulkCreate.mock.calls[0][1]).toEqual({ overwrite: true });
      expect(clients.savedObjectsClient.bulkCreate.mock.calls[0][0]).toMatchSnapshot();

      expect(response.status).toEqual(200);
    }
  );
});
