/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { Sha256 } from '@kbn/crypto-browser';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

import { registerUserContext } from './register_user_context';
import { authenticationMock } from '../authentication/index.mock';
import { securityMock } from '../mocks';

describe('registerUserContext', () => {
  const username = '1234';
  const expectedHashedPlainUsername = new Sha256().update(username, 'utf8').digest('hex');

  let analytics: jest.Mocked<AnalyticsServiceSetup>;
  let authentication: jest.Mocked<AuthenticationServiceSetup>;

  beforeEach(() => {
    jest.clearAllMocks();
    analytics = coreMock.createSetup().analytics;
    authentication = authenticationMock.createSetup();
    authentication.getCurrentUser.mockResolvedValue(securityMock.createMockAuthenticatedUser());
  });

  test('register the context provider for the cloud user with hashed user ID when security is available', async () => {
    registerUserContext(analytics, authentication, 'cloudId');

    expect(analytics.registerContextProvider).toHaveBeenCalled();

    const [{ context$ }] = analytics.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    await expect(firstValueFrom(context$)).resolves.toEqual({
      userId: '7a3e98632e2c878671da5d5c49e625dd84fb4ba85758feae9a5fd5ec57724753',
      isElasticCloudUser: false,
    });
  });

  it('user hash includes cloud id', async () => {
    authentication.getCurrentUser.mockResolvedValue(
      securityMock.createMockAuthenticatedUser({ username })
    );
    const analytics1 = coreMock.createSetup().analytics;
    registerUserContext(analytics1, authentication, 'esOrg1');

    const [{ context$: context1$ }] = analytics1.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    const { userId: hashId1 } = (await firstValueFrom(context1$)) as { userId: string };
    expect(hashId1).not.toEqual(expectedHashedPlainUsername);

    const analytics2 = coreMock.createSetup().analytics;
    registerUserContext(analytics2, authentication, 'esOrg2');
    const [{ context$: context2$ }] = analytics2.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    const { userId: hashId2 } = (await firstValueFrom(context2$)) as { userId: string };
    expect(hashId2).not.toEqual(expectedHashedPlainUsername);

    expect(hashId1).not.toEqual(hashId2);
  });

  test('user hash does not include cloudId when user is an Elastic Cloud user', async () => {
    authentication.getCurrentUser.mockResolvedValue(
      securityMock.createMockAuthenticatedUser({ username, elastic_cloud_user: true })
    );
    registerUserContext(analytics, authentication, 'cloudDeploymentId');

    expect(analytics.registerContextProvider).toHaveBeenCalled();

    const [{ context$ }] = analytics.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    await expect(firstValueFrom(context$)).resolves.toEqual({
      userId: expectedHashedPlainUsername,
      isElasticCloudUser: true,
    });
  });

  test('user hash does not include cloudId when not provided', async () => {
    authentication.getCurrentUser.mockResolvedValue(
      securityMock.createMockAuthenticatedUser({ username })
    );
    registerUserContext(analytics, authentication);

    expect(analytics.registerContextProvider).toHaveBeenCalled();

    const [{ context$ }] = analytics.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    await expect(firstValueFrom(context$)).resolves.toEqual({
      userId: expectedHashedPlainUsername,
      isElasticCloudUser: false,
    });
  });

  test('user hash is undefined when failed to fetch a user', async () => {
    authentication.getCurrentUser.mockRejectedValue(new Error('failed to fetch a user'));

    registerUserContext(analytics, authentication);

    expect(analytics.registerContextProvider).toHaveBeenCalled();

    const [{ context$ }] = analytics.registerContextProvider.mock.calls.find(
      ([{ name }]) => name === 'user_id'
    )!;

    await expect(firstValueFrom(context$)).resolves.toEqual({
      userId: undefined,
      isElasticCloudUser: false,
    });
  });
});
