/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('net');
jest.mock('tls');

import { Socket } from 'net';
import { PeerCertificate, TLSSocket } from 'tls';
import Boom from '@hapi/boom';
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

      // Imitate other fields for logging assertions
      certificate.subject = 'mock subject';
      certificate.issuer = 'mock issuer';
      certificate.subjectaltname = 'mock subjectaltname';
      certificate.valid_from = 'mock valid_from';
      certificate.valid_to = 'mock valid_to';

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
  if (!authorized) {
    socket.authorizationError = new Error('mock authorization error');
  }
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
    it('does not handle unauthorized requests.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: false,
          peerCertificate: getMockPeerCertificate('2A:7A:C2:DD'),
        }),
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(
        'Peer certificate chain: [{"subject":"mock subject","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]'
      );
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(
        'Authentication is not possible since peer certificate was not authorized: Error: mock authorization error.'
      );
    });

    it('does not handle requests with a missing certificate chain.', async () => {
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true, peerCertificate: null }),
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockOptions.logger.debug).toHaveBeenCalledWith('Peer certificate chain: []');
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(
        'Authentication is not possible due to missing peer certificate chain.'
      );
    });

    it('does not handle requests with an incomplete certificate chain.', async () => {
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      (peerCertificate as any).issuerCertificate = undefined; // This behavior has been observed, even though it's not valid according to the type definition
      const request = httpServerMock.createKibanaRequest({
        socket: getMockSocket({ authorized: true, peerCertificate }),
      });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.callAsInternalUser).not.toHaveBeenCalled();
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(
        'Peer certificate chain: [{"subject":"mock subject","issuer":"mock issuer","issuerCertType":"undefined","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]'
      );
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(
        'Authentication is not possible due to incomplete peer certificate chain.'
      );
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

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        authentication: user,
        access_token: 'access-token',
      });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'pki', name: 'pki' } },
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
      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

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

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        authentication: user,
        access_token: 'access-token',
      });

      await expect(operation(request)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'pki', name: 'pki' } },
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
      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

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

    it('does not exchange peer certificate to access token for Ajax requests.', async () => {
      const request = httpServerMock.createKibanaRequest({
        headers: { 'kbn-xsrf': 'xsrf' },
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

      mockOptions.client.callAsInternalUser.mockResolvedValue({
        authentication: user,
        access_token: 'access-token',
      });

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'pki', name: 'pki' } },
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
      const user = mockAuthenticatedUser({ authentication_provider: { type: 'pki', name: 'pki' } });

      const mockScopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
      mockScopedClusterClient.callAsCurrentUser.mockRejectedValue(
        LegacyElasticsearchErrorHelpers.decorateNotAuthorizedError(new Error())
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.callAsInternalUser.mockResolvedValue({
        authentication: user,
        access_token: 'access-token',
      });

      const nonAjaxRequest = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const nonAjaxState = {
        accessToken: 'existing-token',
        peerCertificateFingerprint256: '2A:7A:C2:DD',
      };
      await expect(provider.authenticate(nonAjaxRequest, nonAjaxState)).resolves.toEqual(
        AuthenticationResult.succeeded(user, {
          authHeaders: { authorization: 'Bearer access-token' },
          state: { accessToken: 'access-token', peerCertificateFingerprint256: '2A:7A:C2:DD' },
        })
      );

      const ajaxRequest = httpServerMock.createKibanaRequest({
        headers: { 'kbn-xsrf': 'xsrf' },
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['3A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const ajaxState = {
        accessToken: 'existing-token',
        peerCertificateFingerprint256: '3A:7A:C2:DD',
      };
      await expect(provider.authenticate(ajaxRequest, ajaxState)).resolves.toEqual(
        AuthenticationResult.succeeded(user, {
          authHeaders: { authorization: 'Bearer access-token' },
          state: { accessToken: 'access-token', peerCertificateFingerprint256: '3A:7A:C2:DD' },
        })
      );

      const optionalAuthRequest = httpServerMock.createKibanaRequest({
        routeAuthRequired: false,
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['4A:7A:C2:DD', '3B:8B:D3:EE']),
        }),
      });
      const optionalAuthState = {
        accessToken: 'existing-token',
        peerCertificateFingerprint256: '4A:7A:C2:DD',
      };
      await expect(provider.authenticate(optionalAuthRequest, optionalAuthState)).resolves.toEqual(
        AuthenticationResult.succeeded(user, {
          authHeaders: { authorization: 'Bearer access-token' },
          state: { accessToken: 'access-token', peerCertificateFingerprint256: '4A:7A:C2:DD' },
        })
      );

      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledTimes(3);
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:3A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });
      expect(mockOptions.client.callAsInternalUser).toHaveBeenCalledWith('shield.delegatePKI', {
        body: {
          x509_certificate_chain: [
            'fingerprint:4A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });

      expect(nonAjaxRequest.headers).not.toHaveProperty('authorization');
      expect(ajaxRequest.headers).not.toHaveProperty('authorization');
      expect(optionalAuthRequest.headers).not.toHaveProperty('authorization');
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
          { ...user, authentication_provider: { type: 'pki', name: 'pki' } },
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

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('redirects to logged out view if state is `null`.', async () => {
      const request = httpServerMock.createKibanaRequest();

      await expect(provider.logout(request, null)).resolves.toEqual(
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
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
        DeauthenticationResult.redirectTo(mockOptions.urls.loggedOut(request))
      );

      expect(mockOptions.tokens.invalidate).toHaveBeenCalledTimes(1);
      expect(mockOptions.tokens.invalidate).toHaveBeenCalledWith({ accessToken: 'foo' });
    });
  });

  it('`getHTTPAuthenticationScheme` method', () => {
    expect(provider.getHTTPAuthenticationScheme()).toBe('bearer');
  });
});
