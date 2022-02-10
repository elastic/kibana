/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import { UserProfileService } from './user_profile_service';

const logger = loggingSystemMock.createLogger();
const userProfileService = new UserProfileService(logger);
const elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();

describe('UserProfileService', () => {
  beforeEach(() => {
    elasticsearchClient.transport.request.mockReturnValue(
      elasticsearchServiceMock.createSuccessTransportRequestPromise({
        UID: {
          uid: 'UID',
          user: {},
          data: {
            kibana: {
              avatar: 'fun.gif',
            },
            other_app: {
              secret: 'data',
            },
          },
        },
      })
    );
  });

  afterEach(() => {
    elasticsearchClient.transport.request.mockClear();
    logger.error.mockClear();
  });

  it('should expose correct start contract', () => {
    const startContract = userProfileService.start(elasticsearchClient);
    expect(startContract).toMatchInlineSnapshot(`
      Object {
        "get": [Function],
        "update": [Function],
      }
    `);
  });

  it('should get user profile', async () => {
    const startContract = userProfileService.start(elasticsearchClient);
    await expect(startContract.get('UID')).resolves.toMatchInlineSnapshot(`
            Object {
              "data": Object {
                "avatar": "fun.gif",
              },
              "uid": "UID",
              "user": Object {},
            }
          `);
    expect(elasticsearchClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '_security/profile/UID',
    });
  });

  it('should handle errors when get user profile fails', async () => {
    elasticsearchClient.transport.request.mockRejectedValue(new Error('Fail'));
    const startContract = userProfileService.start(elasticsearchClient);
    await expect(startContract.get('UID')).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should get user profile and application data scoped to Kibana', async () => {
    const startContract = userProfileService.start(elasticsearchClient);
    await expect(startContract.get('UID', '*')).resolves.toMatchInlineSnapshot(`
            Object {
              "data": Object {
                "avatar": "fun.gif",
              },
              "uid": "UID",
              "user": Object {},
            }
          `);
    expect(elasticsearchClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '_security/profile/UID?data=kibana.*',
    });
  });

  it('should update application data scoped to Kibana', async () => {
    const startContract = userProfileService.start(elasticsearchClient);
    await startContract.update('UID', {
      avatar: 'boring.png',
    });
    expect(elasticsearchClient.transport.request).toHaveBeenCalledWith({
      body: {
        data: {
          kibana: {
            avatar: 'boring.png',
          },
        },
      },
      method: 'POST',
      path: '_security/profile/_data/UID',
    });
  });

  it('should handle errors when update user profile fails', async () => {
    elasticsearchClient.transport.request.mockRejectedValue(new Error('Fail'));
    const startContract = userProfileService.start(elasticsearchClient);
    await expect(
      startContract.update('UID', {
        avatar: 'boring.png',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Fail]`);
    expect(logger.error).toHaveBeenCalled();
  });
});
