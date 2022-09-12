/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { PREBUILT_SAVED_OBJECTS_BULK_DELETE } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  mockGetCurrentUser,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { deletePrebuiltSavedObjectsRoute } from './delete_prebuilt_saved_objects';

const deletePrebuiltSavedObjectsRequest = (savedObjectTemplate: string) =>
  requestMock.create({
    method: 'post',
    path: PREBUILT_SAVED_OBJECTS_BULK_DELETE,
    params: { template_name: savedObjectTemplate },
  });

describe('deletePrebuiltSavedObjects', () => {
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

    clients.savedObjectsClient.delete.mockResolvedValue('');

    deletePrebuiltSavedObjectsRoute(server.router, securitySetup);
  });

  it('should delete hostRiskScoreDashboards', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('hostRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[0][1]).toMatchInlineSnapshot(
      `"ml-host-risk-score-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[0][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[1][1]).toMatchInlineSnapshot(
      `"d3f72670-d3a0-11eb-bd37-7bb50422e346"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[1][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[2][1]).toMatchInlineSnapshot(
      `"alerts-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[2][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[3][1]).toMatchInlineSnapshot(
      `"42371d00-cf7a-11eb-9a96-05d89f94ad96"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[3][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[4][1]).toMatchInlineSnapshot(
      `"a62d3ed0-cf92-11eb-a0ff-1763d16cbda7"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[4][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[5][1]).toMatchInlineSnapshot(
      `"b2dbc9b0-cf94-11eb-bd37-7bb50422e346"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[5][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[6][1]).toMatchInlineSnapshot(
      `"1d00ebe0-f3b2-11eb-beb2-b91666445a94"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[6][0]).toMatchInlineSnapshot(`"tag"`);

    expect(clients.savedObjectsClient.delete.mock.calls[7][1]).toMatchInlineSnapshot(
      `"6f05c8c0-cf77-11eb-9a96-05d89f94ad96"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[7][0]).toMatchInlineSnapshot(`"dashboard"`);

    expect(clients.savedObjectsClient.delete.mock.calls[8][1]).toMatchInlineSnapshot(
      `"ml-host-risk-score-latest-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[8][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[9][1]).toMatchInlineSnapshot(
      `"dc289c10-d4ff-11eb-a0ff-1763d16cbda7"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[9][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[10][1]).toMatchInlineSnapshot(
      `"27b483b0-d500-11eb-a0ff-1763d16cbda7"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[10][0]).toMatchInlineSnapshot(
      `"dashboard"`
    );

    expect(response.status).toEqual(200);
  });
});
