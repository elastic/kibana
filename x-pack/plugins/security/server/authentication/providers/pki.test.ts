/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('net');
jest.mock('tls');

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { Socket } from 'net';
import type { PeerCertificate } from 'tls';
import { TLSSocket } from 'tls';

import type { KibanaRequest, ScopeableRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';

import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import type { MockAuthenticationProviderOptions } from './base.mock';
import { mockAuthenticationProviderOptions } from './base.mock';
import { PKIAuthenticationProvider } from './pki';

interface MockPeerCertificate extends Partial<PeerCertificate> {
  issuerCertificate: MockPeerCertificate;
  fingerprint256: string;
}

function getMockPeerCertificate(chain: string[] | string, isChainIncomplete = false) {
  const mockPeerCertificate = {} as MockPeerCertificate;

  (Array.isArray(chain) ? chain : [chain]).reduce(
    (certificate, fingerprint, index, fingerprintChain) => {
      certificate.fingerprint256 = fingerprint;
      certificate.raw = { toString: (enc: string) => `fingerprint:${fingerprint}:${enc}` };

      if (index === fingerprintChain.length - 1) {
        // If the chain is incomplete, set the issuer to undefined.
        // Otherwise, imitate self-signed certificate that is issuer for itself.
        certificate.issuerCertificate = isChainIncomplete ? undefined : certificate;
      } else {
        certificate.issuerCertificate = {};
      }

      // Imitate other fields for logging assertions
      certificate.subject = `mock subject(${fingerprint})`;
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
  protocol = 'TLSv1.2',
  renegotiateError = null,
}: {
  authorized?: boolean;
  peerCertificate?: MockPeerCertificate | null;
  protocol?: string;
  renegotiateError?: Error | null;
} = {}) {
  const socket = new TLSSocket(new Socket());
  socket.authorized = authorized;
  if (!authorized) {
    socket.authorizationError = new Error('mock authorization error');
  }
  const mockGetPeerCertificate = jest.fn().mockReturnValue(peerCertificate);
  const mockRenegotiate = jest.fn().mockImplementation((_, callback) => callback(renegotiateError));
  socket.getPeerCertificate = mockGetPeerCertificate;
  socket.renegotiate = mockRenegotiate;
  socket.getProtocol = jest.fn().mockReturnValue(protocol);
  return { socket, mockGetPeerCertificate, mockRenegotiate };
}

function expectAuthenticateCall(
  mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>,
  scopeableRequest: ScopeableRequest
) {
  expect(mockClusterClient.asScoped).toHaveBeenCalledTimes(1);
  expect(mockClusterClient.asScoped).toHaveBeenCalledWith(scopeableRequest);

  const mockScopedClusterClient = mockClusterClient.asScoped.mock.results[0].value;
  expect(mockScopedClusterClient.asCurrentUser.security.authenticate).toHaveBeenCalledTimes(1);
}

describe('PKIAuthenticationProvider', () => {
  let provider: PKIAuthenticationProvider;
  let mockOptions: MockAuthenticationProviderOptions;
  beforeEach(() => {
    mockOptions = mockAuthenticationProviderOptions({ name: 'pki' });
    provider = new PKIAuthenticationProvider(mockOptions);
  });

  afterEach(() => jest.clearAllMocks());

  function expectDebugLogs(...messages: string[]) {
    for (const message of messages) {
      expect(mockOptions.logger.debug).toHaveBeenCalledWith(message);
    }
  }

  function defineCommonLoginAndAuthenticateTests(
    operation: (request: KibanaRequest) => Promise<AuthenticationResult>
  ) {
    it('does not handle unauthorized requests.', async () => {
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ authorized: false, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      expectDebugLogs(
        'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
        'Authentication is not possible since peer certificate was not authorized: Error: mock authorization error.'
      );
    });

    it('does not handle requests with a missing certificate chain.', async () => {
      const { socket } = getMockSocket({ authorized: true, peerCertificate: null });
      const request = httpServerMock.createKibanaRequest({ socket });

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      expectDebugLogs(
        'Peer certificate chain: []',
        'Authentication is not possible due to missing peer certificate chain.'
      );
    });

    describe('incomplete certificate chain', () => {
      it('when the protocol does not allow renegotiation', async () => {
        const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD', true);
        const { socket, mockGetPeerCertificate, mockRenegotiate } = getMockSocket({
          authorized: true,
          peerCertificate,
          protocol: 'TLSv1.3',
        });
        const request = httpServerMock.createKibanaRequest({ socket });

        await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
        expectDebugLogs(
          `Detected incomplete certificate chain with protocol 'TLSv1.3', cannot renegotiate connection.`,
          'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"undefined","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
          'Authentication is not possible due to incomplete peer certificate chain.'
        );
        expect(mockGetPeerCertificate).toHaveBeenCalledTimes(1);
        expect(mockRenegotiate).not.toHaveBeenCalled();
      });

      it('when renegotiation fails', async () => {
        const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD', true);
        const { socket, mockGetPeerCertificate, mockRenegotiate } = getMockSocket({
          authorized: true,
          peerCertificate,
          renegotiateError: new Error('Oh no!'),
        });
        const request = httpServerMock.createKibanaRequest({ socket });

        await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
        expectDebugLogs(
          `Detected incomplete certificate chain with protocol 'TLSv1.2', attempting to renegotiate connection.`,
          `Failed to renegotiate connection: Error: Oh no!.`,
          'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"undefined","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
          'Authentication is not possible due to incomplete peer certificate chain.'
        );
        expect(mockGetPeerCertificate).toHaveBeenCalledTimes(1);
        expect(mockRenegotiate).toHaveBeenCalledTimes(1);
      });

      it('when renegotiation results in an incomplete cert chain', async () => {
        const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD', true);
        const { socket, mockGetPeerCertificate, mockRenegotiate } = getMockSocket({
          authorized: true,
          peerCertificate,
        });
        const request = httpServerMock.createKibanaRequest({ socket });

        await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
        expectDebugLogs(
          `Detected incomplete certificate chain with protocol 'TLSv1.2', attempting to renegotiate connection.`,
          'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"undefined","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
          'Authentication is not possible due to incomplete peer certificate chain.'
        );
        expect(mockGetPeerCertificate).toHaveBeenCalledTimes(2);
        expect(mockRenegotiate).toHaveBeenCalledTimes(1);
      });

      it('when renegotiation results in a complete cert chain with an unauthorized socket', async () => {
        const { socket, mockGetPeerCertificate, mockRenegotiate } = getMockSocket({
          authorized: true,
        });
        const peerCertificate1 = getMockPeerCertificate('2A:7A:C2:DD', true); // incomplete chain
        const peerCertificate2 = getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']); // complete chain
        mockGetPeerCertificate.mockReturnValue(peerCertificate2);
        mockGetPeerCertificate.mockReturnValueOnce(peerCertificate1);
        mockRenegotiate.mockImplementation((_, callback) => {
          socket.authorized = false;
          socket.authorizationError = new Error('Oh no!');
          callback();
        });
        const request = httpServerMock.createKibanaRequest({ socket });

        await expect(operation(request)).resolves.toEqual(AuthenticationResult.notHandled());

        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
        expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
        expectDebugLogs(
          `Detected incomplete certificate chain with protocol 'TLSv1.2', attempting to renegotiate connection.`,
          'Self-signed certificate is detected in certificate chain',
          'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}, {"subject":"mock subject(3B:8B:D3:EE)","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
          'Authentication is not possible since peer certificate was not authorized: Error: Oh no!.'
        );
        expect(mockGetPeerCertificate).toHaveBeenCalledTimes(2);
        expect(mockRenegotiate).toHaveBeenCalledTimes(1);
      });

      it('when renegotiation results in a complete cert chain with an authorized socket', async () => {
        const user = mockAuthenticatedUser();
        const { socket, mockGetPeerCertificate, mockRenegotiate } = getMockSocket({
          authorized: true,
        });
        const peerCertificate1 = getMockPeerCertificate('2A:7A:C2:DD', true); // incomplete chain
        const peerCertificate2 = getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']); // complete chain
        mockGetPeerCertificate.mockReturnValue(peerCertificate2);
        mockGetPeerCertificate.mockReturnValueOnce(peerCertificate1);
        const request = httpServerMock.createKibanaRequest({ socket });

        mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
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

        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
        expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
          method: 'POST',
          path: '/_security/delegate_pki',
          body: {
            x509_certificate_chain: [
              'fingerprint:2A:7A:C2:DD:base64',
              'fingerprint:3B:8B:D3:EE:base64',
            ],
          },
        });
        expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
        expectDebugLogs(
          `Detected incomplete certificate chain with protocol 'TLSv1.2', attempting to renegotiate connection.`,
          'Self-signed certificate is detected in certificate chain',
          'Peer certificate chain: [{"subject":"mock subject(2A:7A:C2:DD)","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}, {"subject":"mock subject(3B:8B:D3:EE)","issuer":"mock issuer","issuerCertType":"object","subjectaltname":"mock subjectaltname","validFrom":"mock valid_from","validTo":"mock valid_to"}]',
          'Successfully retrieved access token in exchange to peer certificate chain.'
        );
        expect(mockGetPeerCertificate).toHaveBeenCalledTimes(2);
        expect(mockRenegotiate).toHaveBeenCalledTimes(1);
      });
    });

    it('gets an access token in exchange to peer certificate chain and stores it in the state.', async () => {
      const user = mockAuthenticatedUser();
      const peerCertificate = getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']);
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, headers: {} });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
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

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
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
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, headers: {} });

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
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

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
        body: { x509_certificate_chain: ['fingerprint:2A:7A:C2:DD:base64'] },
      });
      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if could not retrieve an access token in exchange to peer certificate chain.', async () => {
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, headers: {} });

      const failureReason = new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 401, body: {} })
      );
      mockOptions.client.asInternalUser.transport.request.mockRejectedValue(failureReason);

      await expect(operation(request)).resolves.toEqual(AuthenticationResult.failed(failureReason));

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
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
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
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
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer some-token');
    });

    it('does not exchange peer certificate to access token if request does not require authentication.', async () => {
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, routeAuthRequired: false });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('does not exchange peer certificate to access token for Ajax requests.', async () => {
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({
        socket,
        headers: { 'kbn-xsrf': 'xsrf' },
      });
      await expect(provider.authenticate(request)).resolves.toEqual(
        AuthenticationResult.notHandled()
      );

      expect(mockOptions.client.asScoped).not.toHaveBeenCalled();
      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();
    });

    it('fails with non-401 error if state is available, peer is authorized, but certificate is not available.', async () => {
      const { socket } = getMockSocket({ authorized: true });
      const request = httpServerMock.createKibanaRequest({ socket });

      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(new Error('Peer certificate is not available'))
      );

      expect(mockOptions.tokens.invalidate).not.toHaveBeenCalled();
    });

    it('invalidates token and fails with 401 if state is present, but peer certificate is not.', async () => {
      const { socket } = getMockSocket();
      const request = httpServerMock.createKibanaRequest({ socket });
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
      const peerCertificate = getMockPeerCertificate('2A:7A:C2:DD');
      const { socket } = getMockSocket({ peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket });
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
      const peerCertificate = getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']);
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '3A:9A:C5:DD' };

      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
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

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(1);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
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

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);
      mockOptions.client.asInternalUser.transport.request.mockResolvedValue({
        authentication: user,
        access_token: 'access-token',
      });

      const nonAjaxRequest = httpServerMock.createKibanaRequest({
        socket: getMockSocket({
          authorized: true,
          peerCertificate: getMockPeerCertificate(['2A:7A:C2:DD', '3B:8B:D3:EE']),
        }).socket,
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
        }).socket,
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
        }).socket,
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

      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledTimes(3);
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
        body: {
          x509_certificate_chain: [
            'fingerprint:2A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
        body: {
          x509_certificate_chain: [
            'fingerprint:3A:7A:C2:DD:base64',
            'fingerprint:3B:8B:D3:EE:base64',
          ],
        },
      });
      expect(mockOptions.client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/_security/delegate_pki',
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
      const { socket } = getMockSocket();
      const request = httpServerMock.createKibanaRequest({ socket });
      const state = { accessToken: 'existing-token', peerCertificateFingerprint256: '2A:7A:C2:DD' };

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(
        new errors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
      );
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.failed(Boom.unauthorized())
      );

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('succeeds if state contains a valid token.', async () => {
      const user = mockAuthenticatedUser();
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const peerCertificate = getMockPeerCertificate(state.peerCertificateFingerprint256);
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, headers: {} });

      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockResponse(user);
      mockOptions.client.asScoped.mockReturnValue(mockScopedClusterClient);

      await expect(provider.authenticate(request, state)).resolves.toEqual(
        AuthenticationResult.succeeded(
          { ...user, authentication_provider: { type: 'pki', name: 'pki' } },
          { authHeaders: { authorization: `Bearer ${state.accessToken}` } }
        )
      );

      expectAuthenticateCall(mockOptions.client, { headers: { authorization: 'Bearer token' } });

      expect(mockOptions.client.asInternalUser.transport.request).not.toHaveBeenCalled();

      expect(request.headers).not.toHaveProperty('authorization');
    });

    it('fails if token from the state is rejected because of unknown reason.', async () => {
      const state = { accessToken: 'token', peerCertificateFingerprint256: '2A:7A:C2:DD' };
      const peerCertificate = getMockPeerCertificate(state.peerCertificateFingerprint256);
      const { socket } = getMockSocket({ authorized: true, peerCertificate });
      const request = httpServerMock.createKibanaRequest({ socket, headers: {} });

      const failureReason = new errors.ConnectionError(
        'unavailable',
        securityMock.createApiResponse({ statusCode: 503, body: {} })
      );
      const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
      mockScopedClusterClient.asCurrentUser.security.authenticate.mockRejectedValue(failureReason);
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
