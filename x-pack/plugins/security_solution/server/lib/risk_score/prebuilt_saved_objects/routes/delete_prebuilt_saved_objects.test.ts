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
      `"<REPLACE-WITH-ID1>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[1][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[2][1]).toMatchInlineSnapshot(
      `"alerts-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[2][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[3][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID2>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[3][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(response.status).toEqual(200);
  });

  it('should delete userRiskScoreDashboards', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('userRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[0][1]).toMatchInlineSnapshot(
      `"ml-user-risk-score-latest-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[0][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[1][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID1>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[1][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[2][1]).toMatchInlineSnapshot(
      `"ml-user-risk-score-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[2][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[3][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID2>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[3][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[4][1]).toMatchInlineSnapshot(
      `"alerts-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[4][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[5][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID3>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[5][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[6][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID4>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[6][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[7][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID5>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[7][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[8][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID6>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[8][0]).toMatchInlineSnapshot(`"tag"`);

    expect(clients.savedObjectsClient.delete.mock.calls[9][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID8>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[9][0]).toMatchInlineSnapshot(`"dashboard"`);

    expect(clients.savedObjectsClient.delete.mock.calls[10][1]).toMatchInlineSnapshot(
      `"<REPLACE-WITH-ID7>"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[10][0]).toMatchInlineSnapshot(
      `"dashboard"`
    );

    expect(response.status).toEqual(200);
  });
});
