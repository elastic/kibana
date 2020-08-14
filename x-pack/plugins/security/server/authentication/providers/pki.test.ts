/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('net');
jest.mock('tls');

import { Socket } from 'net';
import { PeerCertificate, TLSSocket } from 'tls';
import Boom from 'boom';
import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { MockAuthenticationProviderOptions, mockAuthenticationProviderOptions } from './base.mock';

import {
  LegacyElasticsearchErrorHelpers,
  ILegacyClusterClient,
  KibanaRequest,
  ScopeableRequest,
} from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { PKIAuthenticationProvider } from './pki';

interface MockPeerCertificate extends Partial<PeerCertificate> {
  issuerCertificate: MockPeerCertificate;
  fingerprint256: string;
}

function getMockPeerCertificate(chain: string[] | string) {
  const mockPeerCertificate = {} as MockPeerCertificate;

  (Array.isArray(chain) ? chain : [chain]).reduce(
    (certificate, fingerprint, index, fingerprintChain) => {
      certificate.fingerprint256 = fingerprint;
      certificate.raw = { toString: (enc: string) => `fingerprint:${fingerprint}:${enc}` };

      // Imitate self-signed certificate that is issuer for itself.
      certificate.issuerCertificate = index === fingerprintChain.length - 1 ? certificate : {};

      return certificate.issuerCertificate;
    },
    mockPeerCertificate as Record<string, any>
  );

  return mockPeerCertificate;
}

function getMockSocket({
  authorized = false,
  peerCertificate = null,
}: {
  authorized?: boolean;
  peerCertificate?: MockPeerCertificate | null;
} = {}) {
  const socket = new TLSSocket(new Socket());
  socket.authorized = authorized;
  socket.getPeerCertificate = jest.fn().mockReturnValue(peerCertificate);
  return socket;
}

function expectAuthenticateCall(
  mockClusterClient: jest.Mocked<ILegacyClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
  expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');
}

describe('PKIAuthenticationProvider', () => {
  let provider: PKIAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'pki' });
    provider = new PKIAuthenticationProvider(mockOptions);
  });

  afterEach(() => jest.clearAllMocks());

  function defineCommonLoginAndAuthenticateTests(
    operation: (request: KibanaRequest) => Promise<AuthenticationResult>
  ) {
    it('does not handle requests without certificate.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true }),
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('does not handle unauthorized requests.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ peerCertificate: getMockPeerCertificate('2A:7A:C2:DD') }),
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('gets an access token in exchange to peer certificate chain and stores it in the state.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'pki' },
          {
            authHeaders: { authorization: 'Bearer access-token' },
            state: { accessToken: 'access-token', peerCertificateFingerprint256: '2A:7A:C2:DD' },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer access-token' },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('gets an access token in exchange to a self-signed certificate and stores it in the state.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'pki' },
          {
            authHeaders: { authorization: 'Bearer access-token' },
            state: { accessToken: 'access-token', peerCertificateFingerprint256: '2A:7A:C2:DD' },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer access-token' },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if could not retrieve an access token in exchange to peer certificate chain.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      const failureReason = LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expectAuthenticateCall(mockOptions.client, {
        headers: { authorization: 'Bearer access-token' },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });
  }

  describe('`login` method', () => {
    defineCommonLoginAndAuthenticateTests((request) => provider.login(request));
  });

  describe('`authenticate` method', () => {
    defineCommonLoginAndAuthenticateTests((request) => provider.authenticate(request, null));

    it('does not handle authentication via `authorization` header.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not handle authentication via `authorization` header even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-token' },
      });
      const state = {
        accessToken: 'some-valid-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      };

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not exchange peer certificate to access token if request does not require authentication.', async () => {
      const request = httpServerMock.createKibanaRequest({
        routeAuthRequired: false,
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails with non-401 error if state is available, peer is authorized, but certificate is not available.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true }),
      });

      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(new Error('Peer certificate is not available'))
      );

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('invalidates token and fails with 401 if state is present, but peer certificate is not.', async () => {
      const request = httpServerMock.createKibanaRequest({ socket: getMockSocket() });
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
        accessToken: state.accessToken,
      });
    });

    it('invalidates token and fails with 401 if new certificate is present, but not authorized.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ peerCertificate: getMockPeerCertificate('2A:7A:C2:DD') }),
      });
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
        accessToken: state.accessToken,
      });
    });

    it('invalidates existing token and gets a new one if fingerprints do not match.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '3A:9A:C5:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'pki' },
          {
            authHeaders: { authorization: 'Bearer access-token' },
            state: { accessToken: 'access-token', peerCertificateFingerprint256: '2A:7A:C2:DD' },
          }
        )
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
        accessToken: state.accessToken,
      });

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('gets a new access token even if existing token is expired.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser
        // In response to call with an expired token.
        .mockRejectedValueOnce(
          LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
        )
        // In response to a call with a new token.
        .mockResolvedValueOnce(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'pki' },
          {
            authHeaders: { authorization: 'Bearer access-token' },
            state: { accessToken: 'access-token', peerCertificateFingerprint256: '2A:7A:C2:DD' },
          }
        )
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('does not exchange peer certificate to a new access token even if existing token is expired and request does not require authentication.', async () => {
      const request = httpServerMock.createKibanaRequest({
        routeAuthRequired: false,
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValueOnce(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails with 401 if existing token is expired, but certificate is not present.', async () => {
      const request = httpServerMock.createKibanaRequest({ socket: getMockSocket() });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(state.peerCertificateFingerprint256),
        }),
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: 'pki' },
          { authHeaders: { authorization: `Bearer ${state.accessToken}` } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization: 'Bearer token' } });

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(state.peerCertificateFingerprint256),
        }),
      });

      const failureReason = new errors.ServiceUnavailable();
      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(failureReason)
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization: 'Bearer token' } });
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request)).resolves.toEqual(DeauthenticationResult.notHandled());

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.notHandled()
      );

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { accessToken: 'foo', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      await expect(provider.logout(request, state)).resolves.toEqual(
        DeauthenticationResult.failed(failureReason)
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({ accessToken: 'foo' });
    });

    it('redirects to `loggedOut` URL if access token is invalidated successfully.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { accessToken: 'foo', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      await expect(provider.logout(request, state)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut)
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({ accessToken: 'foo' });
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
