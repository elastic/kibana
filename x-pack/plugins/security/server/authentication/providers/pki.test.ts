/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('net');
jest.mock('tls');

import { PeerCertificate, TLSSocket } from 'tls';
import { errors } from 'elasticsearch';

import { elasticsearchServiceMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import {
  MockAuthenticationProviderOptionsWithJest,
  mockAuthenticationProviderOptionsWithJest,
} from './base.mock';

import { PKIAuthenticationProvider } from './pki';
import {
  ElasticsearchErrorHelpers,
  ScopedClusterClient,
} from '../../../../../../src/core/server/elasticsearch';
import { Socket } from 'net';
import { getErrorStatusCode } from '../../errors';

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

describe('PKIAuthenticationProvider', () => {
  let provider: PKIAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptionsWithJest;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptionsWithJest();
    provider = new PKIAuthenticationProvider(mockOptions);
  });

  afterEach(() => jest.clearAllMocks());

  describe('`authenticate` method', () => {
    it('does not handle `authorization` header with unsupported schema even if state contains a valid token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Basic some:credentials' },
      });
      const state = {
        accessToken: 'some-valid-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      };

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Basic some:credentials');
      expect(authenticationResult.notHandled()).toBe(true);
    });

    it('does not handle requests without certificate.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true }),
      });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('does not handle unauthorized requests.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ peerCertificate: getMockPeerCertificate('2A:7A:C2:DD') }),
      });

      const authenticationResult = await provider.authenticate(request, null);

      expect(authenticationResult.notHandled()).toBe(true);
      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails with non-401 error if state is available, peer is authorized, but certificate is not available.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true }),
      });

      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const authenticationResult = await provider.authenticate(request, state);
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toMatchInlineSnapshot(
        `[Error: Peer certificate is not available]`
      );
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('invalidates token and fails with 401 if state is present, but peer certificate is not.', async () => {
      const request = httpServerMock.createKibanaRequest({ socket: getMockSocket() });
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const authenticationResult = await provider.authenticate(request, state);

      expect(authenticationResult.failed()).toBe(true);
      expect(getErrorStatusCode(authenticationResult.error)).toBe(401);

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

      const authenticationResult = await provider.authenticate(request, state);

      expect(authenticationResult.failed()).toBe(true);
      expect(getErrorStatusCode(authenticationResult.error)).toBe(401);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({
        accessToken: state.accessToken,
      });
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Bearer access-token` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer access-token' });
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(authenticationResult.state).toEqual({
        accessToken: 'access-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      });
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Bearer access-token` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer access-token' });
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(authenticationResult.state).toEqual({
        accessToken: 'access-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      const authenticationResult = await provider.authenticate(request, state);

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
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer access-token' });
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(authenticationResult.state).toEqual({
        accessToken: 'access-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      });
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser
        // In response to call with an expired token.
        .mockRejectedValueOnce(ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error()))
        // In response to a call with a new token.
        .mockResolvedValueOnce(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      const authenticationResult = await provider.authenticate(request, state);

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
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.authHeaders).toEqual({ authorization: 'Bearer access-token' });
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
      expect(authenticationResult.state).toEqual({
        accessToken: 'access-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      });
    });

    it('fails with 401 if existing token is expired, but certificate is not present.', async () => {
      const request = httpServerMock.createKibanaRequest({ socket: getMockSocket() });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(getErrorStatusCode(authenticationResult.error)).toBe(401);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('fails if could not retrieve an access token in exchange to peer certificate chain.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      mockOptions.client.callAsInternalUser.mockRejectedValue(failureReason);

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('fails if could not retrieve user using the new access token.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: {},
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );
      mockOptions.client.callAsInternalUser.mockResolvedValue({ access_token: 'access-token' });

      const authenticationResult = await provider.authenticate(request);

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });

      expect(mockOptions.client.asScoped).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asScoped).toHaveBeenCalledWith({
        headers: { authorization: `Bearer access-token` },
      });
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockScopedClusterClient.callAsCurrentUser).toHaveBeenCalledWith('shield.authenticate');

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(state.peerCertificateFingerprint256),
        }),
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request, state);

      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toEqual({
        authorization: `Bearer ${state.accessToken}`,
      });
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(state.peerCertificateFingerprint256),
        }),
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(new errors.ServiceUnavailable());
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request, state);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toHaveProperty('status', 503);
      expect(authenticationResult.authResponseHeaders).toBeUndefined();
    });

    it('succeeds if `authorization` contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-valid-token' },
      });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockResolvedValue(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request);

      expect(request.headers.authorization).toBe('Bearer some-valid-token');
      expect(authenticationResult.succeeded()).toBe(true);
      expect(authenticationResult.authHeaders).toBeUndefined();
      expect(authenticationResult.user).toBe(user);
      expect(authenticationResult.state).toBeUndefined();
    });

    it('fails if token from `authorization` header is rejected.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-invalid-token' },
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(failureReason);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('fails if token from `authorization` header is rejected even if state contains a valid one.', async () => {
      const user = mockAuthenticatedUser();
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer some-invalid-token' },
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(state.peerCertificateFingerprint256),
        }),
      });

      const failureReason = ElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error());
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser
        // In response to call with a token from header.
        .mockRejectedValueOnce(failureReason)
        // In response to a call with a token from session (not expected to be called).
        .mockResolvedValueOnce(user);
      mockOptions.client.asScoped.mockReturnValue(
        (mockScopedClusterClient as unknown) as jest.Mocked<ScopedClusterClient>
      );

      const authenticationResult = await provider.authenticate(request, state);

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });
  });

  describe('`logout` method', () => {
    it('returns `notHandled` if state is not presented.', async () => {
      const request = httpServerMock.createKibanaRequest();

      let deauthenticateResult = await provider.logout(request);
      expect(deauthenticateResult.notHandled()).toBe(true);

      deauthenticateResult = await provider.logout(request, null);
      expect(deauthenticateResult.notHandled()).toBe(true);

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('fails if `tokens.invalidate` fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { accessToken: 'foo', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const failureReason = new Error('failed to delete token');
      mockOptions.tokens.invalidate.mockRejectedValue(failureReason);

      const authenticationResult = await provider.logout(request, state);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({ accessToken: 'foo' });

      expect(authenticationResult.failed()).toBe(true);
      expect(authenticationResult.error).toBe(failureReason);
    });

    it('redirects to `/logged_out` page if access token is invalidated successfully.', async () => {
      const request = httpServerMock.createKibanaRequest();
      const state = { accessToken: 'foo', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      mockOptions.tokens.invalidate.mockResolvedValue(undefined);

      const authenticationResult = await provider.logout(request, state);

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({ accessToken: 'foo' });

      expect(authenticationResult.redirected()).toBe(true);
      expect(authenticationResult.redirectURL).toBe('/mock-server-basepath/logged_out');
    });
  });
});
