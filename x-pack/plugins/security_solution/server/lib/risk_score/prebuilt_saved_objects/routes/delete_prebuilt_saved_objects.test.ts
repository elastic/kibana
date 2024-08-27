/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PREBUILT_SAVED_OBJECTS_BULK_DELETE } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { deletePrebuiltSavedObjectsRoute } from './delete_prebuilt_saved_objects';

jest.mock('../../../tags/saved_objects', () => {
  return {
    findTagsByName: jest.fn().mockResolvedValue([
      {
        id: 'tagID',
        name: 'my tag',
        type: 'tag',
      },
    ]),
  };
});

jest.mock('../helpers/create_risk_score_tag', () => {
  const actual = jest.requireActual('../helpers/create_risk_score_tag');
  return {
    ...actual,
    findSavedObjectsWithTagReference: jest
      .fn()
      .mockResolvedValue([{ id: 'test-1', type: 'test-type' }]),
  };
});

const deletePrebuiltSavedObjectsRequest = (savedObjectTemplate: string) =>
  requestMock.create({
    method: 'post',
    path: PREBUILT_SAVED_OBJECTS_BULK_DELETE,
    params: { template_name: savedObjectTemplate },
    body: {
      deleteAll: true,
    },
  });

describe('deletePrebuiltSavedObjects', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.clearAllMocks();

    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.savedObjectsClient.delete.mockResolvedValue('');

    deletePrebuiltSavedObjectsRoute(server.router);
  });

  it('should delete legacy hostRiskScoreDashboards', async () => {
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

  it('should delete all hostRiskScoreDashboards saved objects with given tag reference if deleteAll is true', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('hostRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[11][1]).toMatchInlineSnapshot(`"test-1"`);
    expect(clients.savedObjectsClient.delete.mock.calls[11][0]).toMatchInlineSnapshot(
      `"test-type"`
    );

    expect(response.status).toEqual(200);
  });

  it('should delete the tag linked to hostRiskScoreDashboards saved objects if deleteAll is true', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('hostRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[12][1]).toMatchInlineSnapshot(`"tagID"`);
    expect(clients.savedObjectsClient.delete.mock.calls[12][0]).toMatchInlineSnapshot(`"tag"`);

    expect(response.status).toEqual(200);
  });

  it('should delete legacy userRiskScoreDashboards', async () => {
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
      `"54dadd60-1a57-11ed-bb53-ad8c26f4d942"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[1][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[2][1]).toMatchInlineSnapshot(
      `"ml-user-risk-score-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[2][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[3][1]).toMatchInlineSnapshot(
      `"60454070-9a5d-11ec-9633-5f782d122340"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[3][0]).toMatchInlineSnapshot(`"lens"`);

    expect(clients.savedObjectsClient.delete.mock.calls[4][1]).toMatchInlineSnapshot(
      `"alerts-default-index-pattern"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[4][0]).toMatchInlineSnapshot(
      `"index-pattern"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[5][1]).toMatchInlineSnapshot(
      `"a62d3ed0-cf92-11eb-a0ff-1763d16cbda7"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[5][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[6][1]).toMatchInlineSnapshot(
      `"42371d00-cf7a-11eb-9a96-05d89f94ad96"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[6][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[7][1]).toMatchInlineSnapshot(
      `"183d32f0-9a5e-11ec-90d3-1109ed409ab5"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[7][0]).toMatchInlineSnapshot(
      `"visualization"`
    );

    expect(clients.savedObjectsClient.delete.mock.calls[8][1]).toMatchInlineSnapshot(
      `"93fc0f00-1a57-11ed-bb53-ad8c26f4d942"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[8][0]).toMatchInlineSnapshot(`"tag"`);

    expect(clients.savedObjectsClient.delete.mock.calls[9][1]).toMatchInlineSnapshot(
      `"1355b030-ca2b-11ec-962f-a3a018b7d10f"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[9][0]).toMatchInlineSnapshot(`"dashboard"`);

    expect(clients.savedObjectsClient.delete.mock.calls[10][1]).toMatchInlineSnapshot(
      `"8ac3ad30-1a57-11ed-bb53-ad8c26f4d942"`
    );
    expect(clients.savedObjectsClient.delete.mock.calls[10][0]).toMatchInlineSnapshot(
      `"dashboard"`
    );

    expect(response.status).toEqual(200);
  });

  it('should delete all userRiskScoreDashboards saved objects with given tag reference if deleteAll is true', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('userRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[11][1]).toMatchInlineSnapshot(`"test-1"`);
    expect(clients.savedObjectsClient.delete.mock.calls[11][0]).toMatchInlineSnapshot(
      `"test-type"`
    );

    expect(response.status).toEqual(200);
  });

  it('should delete the tag linked to userRiskScoreDashboards saved objects if deleteAll is true', async () => {
    const response = await server.inject(
      deletePrebuiltSavedObjectsRequest('userRiskScoreDashboards'),
      requestContextMock.convertContext(context)
    );

    expect(clients.savedObjectsClient.delete.mock.calls[12][1]).toMatchInlineSnapshot(`"tagID"`);
    expect(clients.savedObjectsClient.delete.mock.calls[12][0]).toMatchInlineSnapshot(`"tag"`);

    expect(response.status).toEqual(200);
  });
});
