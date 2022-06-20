/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { UserProfileAPIClient } from './user_profile_api_client';

describe('UserProfileAPIClient', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let apiClient: UserProfileAPIClient;
  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.http.post.mockResolvedValue(undefined);

    apiClient = new UserProfileAPIClient(coreStart.http);
  });

  it('should get user profile without retrieving any user data', async () => {
    await apiClient.get();
    expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/user_profile', {
      query: { data: undefined },
    });
  });

  it('should get user profile and user data', async () => {
    await apiClient.get('*');
    expect(coreStart.http.get).toHaveBeenCalledWith('/internal/security/user_profile', {
      query: { data: '*' },
    });
  });

  it('should update user data', async () => {
    await apiClient.update({ avatar: { imageUrl: 'avatar.png' } });
    expect(coreStart.http.post).toHaveBeenCalledWith('/internal/security/user_profile/_data', {
      body: '{"avatar":{"imageUrl":"avatar.png"}}',
    });
  });
});
