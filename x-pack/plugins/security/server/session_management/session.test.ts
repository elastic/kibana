/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

describe('Session', () => {
  describe('#get', () => {
    it('returns `null` if session cookie does not exist', () => {});

    /*

function getMockOptions({
  session,
  providers,
  http = {},
  selector,
}: {
  session?: AuthenticatorOptions['config']['session'];
  providers?: Record<string, unknown> | string[];
  http?: Partial<AuthenticatorOptions['config']['authc']['http']>;
  selector?: AuthenticatorOptions['config']['authc']['selector'];
} = {}) {
  return {
    auditLogger: securityAuditLoggerMock.create(),
    getCurrentUser: jest.fn(),
    clusterClient: elasticsearchServiceMock.createClusterClient(),
    basePath: httpServiceMock.createSetupContract().basePath,
    license: licenseMock.create(),
    loggers: loggingServiceMock.create(),
    config: createConfig(
      ConfigSchema.validate({ session, authc: { selector, providers, http } }),
      loggingServiceMock.create().get(),
      { isTLSEnabled: false }
    ),
    session: sessionMock.create(),
  };
}

describe('getSessionInfo()', () => {
  let sessionMockInstance: jest.Mocked<PublicMethodsOf<Session>>;
  let getSessionInfo: (r: KibanaRequest) => Promise<SessionInfo | null>;
  beforeEach(async () => {
    sessionMockInstance = sessionMock.create();
    jest.requireMock('./session').Session.mockImplementation(() => sessionMockInstance);

    getSessionInfo = (await setupAuthentication(mockSetupAuthenticationParams)).getSessionInfo;
  });

  it('returns current session info if session exists.', async () => {
    const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();
    const mockInfo = {
      now: currentDate,
      idleTimeoutExpiration: currentDate + 60000,
      lifespanExpiration: currentDate + 120000,
      provider: { type: 'basic', name: 'basic1' },
    };

    sessionMockInstance.get.mockResolvedValue({
      provider: mockInfo.provider,
      idleTimeoutExpiration: mockInfo.idleTimeoutExpiration,
      lifespanExpiration: mockInfo.lifespanExpiration,
      state: { authorization: 'Basic xxx' },
      path: mockSetupAuthenticationParams.http.basePath.serverBasePath,
    });
    jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

    await expect(getSessionInfo(httpServerMock.createKibanaRequest())).resolves.toEqual(mockInfo);
  });

  it('returns `null` if session does not exist.', async () => {
    sessionMockInstance.get.mockResolvedValue(null);

    await expect(getSessionInfo(httpServerMock.createKibanaRequest())).resolves.toBeNull();
  });
});

it('properly initializes session storage and registers auth handler', async () => {
  const config = {
    encryptionKey: 'ab'.repeat(16),
    secureCookies: true,
    cookieName: 'my-sid-cookie',
  };

  await setupAuthentication(mockSetupAuthenticationParams);

  expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledTimes(1);
  expect(mockSetupAuthenticationParams.http.registerAuth).toHaveBeenCalledWith(
    expect.any(Function)
  );

  expect(
    mockSetupAuthenticationParams.http.createCookieSessionStorageFactory
  ).toHaveBeenCalledTimes(1);
  expect(mockSetupAuthenticationParams.http.createCookieSessionStorageFactory).toHaveBeenCalledWith(
    {
      encryptionKey: config.encryptionKey,
      isSecure: config.secureCookies,
      name: config.cookieName,
      validate: expect.any(Function),
    }
  );
});

it('clears legacy session.', async () => {
  const user = mockAuthenticatedUser();
  const request = httpServerMock.createKibanaRequest();

  // Use string format for the `provider` session value field to emulate legacy session.
  mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'basic' });

  mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));

  await expect(
    authenticator.login(request, { provider: { type: 'basic' }, value: {} })
  ).resolves.toEqual(AuthenticationResult.succeeded(user));

  expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledTimes(1);
  expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, {}, null);

  expect(mockSessionStorage.set).not.toHaveBeenCalled();
  expect(mockSessionStorage.clear).toHaveBeenCalled();
});

it('clears session if it belongs to a different provider.', async () => {
  const user = mockAuthenticatedUser();
  const credentials = { username: 'user', password: 'password' };
  const request = httpServerMock.createKibanaRequest();

  mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));
  mockOptions.session.get.mockResolvedValue({
    ...mockSessVal,
    provider: { type: 'token', name: 'token1' },
  });

  await expect(
    authenticator.login(request, { provider: { type: 'basic' }, value: credentials })
  ).resolves.toEqual(AuthenticationResult.succeeded(user));

  expect(mockBasicAuthenticationProvider.login).toHaveBeenCalledWith(request, credentials, null);

  expect(mockOptions.session.set).not.toHaveBeenCalled();
  expect(mockOptions.session.clear).toHaveBeenCalled();
});

it('clears session if it belongs to a provider with the name that is registered but has different type.', async () => {
  const user = mockAuthenticatedUser();
  const credentials = { username: 'user', password: 'password' };
  const request = httpServerMock.createKibanaRequest();

  // Re-configure authenticator with `token` provider that uses the name of `basic`.
  const loginMock = jest.fn().mockResolvedValue(AuthenticationResult.succeeded(user));
  jest.requireMock('./providers/token').TokenAuthenticationProvider.mockImplementation(() => ({
    type: 'token',
    login: loginMock,
    getHTTPAuthenticationScheme: jest.fn(),
  }));
  mockOptions = getMockOptions({ providers: { token: { basic1: { order: 0 } } } });
  authenticator = new Authenticator(mockOptions);

  mockBasicAuthenticationProvider.login.mockResolvedValue(AuthenticationResult.succeeded(user));
  mockOptions.session.get.mockResolvedValue(mockSessVal);

  await expect(
    authenticator.login(request, { provider: { name: 'basic1' }, value: credentials })
  ).resolves.toEqual(AuthenticationResult.succeeded(user));

  expect(loginMock).toHaveBeenCalledWith(request, credentials, null);

  expect(mockOptions.session.set).not.toHaveBeenCalled();
  expect(mockOptions.session.clear).toHaveBeenCalled();
});

it('properly extends session expiration if it is defined.', async () => {
  const user = mockAuthenticatedUser();
  const request = httpServerMock.createKibanaRequest();
  const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();

  // Create new authenticator with non-null session `idleTimeout`.
  mockOptions = getMockOptions({
    session: {
      idleTimeout: duration(3600 * 24),
      lifespan: null,
    },
    providers: { basic: { basic1: { order: 0 } } },
  });

  mockSessionStorage = sessionStorageMock.create();
  mockSessionStorage.get.mockResolvedValue(mockSessVal);
  mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

  authenticator = new Authenticator(mockOptions);

  mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
    AuthenticationResult.succeeded(user)
  );

  jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

  await expect(authenticator.authenticate(request)).resolves.toEqual(
    AuthenticationResult.succeeded(user)
  );

  expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
  expect(mockSessionStorage.set).toHaveBeenCalledWith({
    ...mockSessVal,
    idleTimeoutExpiration: currentDate + 3600 * 24,
  });
  expect(mockSessionStorage.clear).not.toHaveBeenCalled();
});

it('does not extend session lifespan expiration.', async () => {
  const user = mockAuthenticatedUser();
  const request = httpServerMock.createKibanaRequest();
  const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();
  const hr = 1000 * 60 * 60;

  // Create new authenticator with non-null session `idleTimeout` and `lifespan`.
  mockOptions = getMockOptions({
    session: {
      idleTimeout: duration(hr * 2),
      lifespan: duration(hr * 8),
    },
    providers: { basic: { basic1: { order: 0 } } },
  });

  mockSessionStorage = sessionStorageMock.create();
  mockSessionStorage.get.mockResolvedValue({
    ...mockSessVal,
    // this session was created 6.5 hrs ago (and has 1.5 hrs left in its lifespan)
    // it was last extended 1 hour ago, which means it will expire in 1 hour
    idleTimeoutExpiration: currentDate + hr * 1,
    lifespanExpiration: currentDate + hr * 1.5,
  });
  mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

  authenticator = new Authenticator(mockOptions);

  mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
    AuthenticationResult.succeeded(user)
  );

  jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

  await expect(authenticator.authenticate(request)).resolves.toEqual(
    AuthenticationResult.succeeded(user)
  );

  expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
  expect(mockSessionStorage.set).toHaveBeenCalledWith({
    ...mockSessVal,
    idleTimeoutExpiration: currentDate + hr * 2,
    lifespanExpiration: currentDate + hr * 1.5,
  });
  expect(mockSessionStorage.clear).not.toHaveBeenCalled();
});

describe('conditionally updates the session lifespan expiration', () => {
  const hr = 1000 * 60 * 60;
  const currentDate = new Date(Date.UTC(2019, 10, 10)).valueOf();

  async function createAndUpdateSession(
    lifespan: Duration | null,
    oldExpiration: number | null,
    newExpiration: number | null
  ) {
    const user = mockAuthenticatedUser();
    const request = httpServerMock.createKibanaRequest();
    jest.spyOn(Date, 'now').mockImplementation(() => currentDate);

    mockOptions = getMockOptions({
      session: {
        idleTimeout: null,
        lifespan,
      },
      providers: { basic: { basic1: { order: 0 } } },
    });

    mockSessionStorage = sessionStorageMock.create();
    mockSessionStorage.get.mockResolvedValue({
      ...mockSessVal,
      idleTimeoutExpiration: null,
      lifespanExpiration: oldExpiration,
    });
    mockOptions.sessionStorageFactory.asScoped.mockReturnValue(mockSessionStorage);

    authenticator = new Authenticator(mockOptions);

    mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
      AuthenticationResult.succeeded(user)
    );

    await expect(authenticator.authenticate(request)).resolves.toEqual(
      AuthenticationResult.succeeded(user)
    );

    expect(mockSessionStorage.set).toHaveBeenCalledTimes(1);
    expect(mockSessionStorage.set).toHaveBeenCalledWith({
      ...mockSessVal,
      idleTimeoutExpiration: null,
      lifespanExpiration: newExpiration,
    });
    expect(mockSessionStorage.clear).not.toHaveBeenCalled();
  }

  it('does not change a non-null lifespan expiration when configured to non-null value.', async () => {
    await createAndUpdateSession(duration(hr * 8), 1234, 1234);
  });
  it('does not change a null lifespan expiration when configured to null value.', async () => {
    await createAndUpdateSession(null, null, null);
  });
  it('does change a non-null lifespan expiration when configured to null value.', async () => {
    await createAndUpdateSession(null, 1234, null);
  });
  it('does change a null lifespan expiration when configured to non-null value', async () => {
    await createAndUpdateSession(duration(hr * 8), null, currentDate + hr * 8);
  });
});

it('clears legacy session.', async () => {
  const user = mockAuthenticatedUser();
  const request = httpServerMock.createKibanaRequest();

  // Use string format for the `provider` session value field to emulate legacy session.
  mockSessionStorage.get.mockResolvedValue({ ...mockSessVal, provider: 'basic' });

  mockBasicAuthenticationProvider.authenticate.mockResolvedValue(
    AuthenticationResult.succeeded(user)
  );

  await expect(authenticator.authenticate(request)).resolves.toEqual(
    AuthenticationResult.succeeded(user)
  );

  expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalledTimes(1);
  expect(mockBasicAuthenticationProvider.authenticate).toHaveBeenCalledWith(request, null);

  expect(mockSessionStorage.set).not.toHaveBeenCalled();
  expect(mockSessionStorage.clear).toHaveBeenCalled();
});

it('clears session if it belongs to not configured provider.', async () => {
  const request = httpServerMock.createKibanaRequest();
  const state = { authorization: 'Bearer xxx' };
  mockOptions.session.get.mockResolvedValue({
    ...mockSessVal,
    state,
    provider: { type: 'token', name: 'token1' },
  });

  await expect(authenticator.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

  expect(mockBasicAuthenticationProvider.logout).toHaveBeenCalledTimes(1);
  expect(mockOptions.session.clear).toHaveBeenCalled();
});
*/
  });
});
