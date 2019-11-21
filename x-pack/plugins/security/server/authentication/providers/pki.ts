/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { DetailedPeerCertificate } from 'tls';
import { KibanaRequest } from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BaseAuthenticationProvider } from './base';
import { Tokens } from '../tokens';

/**
 * The state supported by the provider.
 */
interface ProviderState {
  /**
   * Access token we got in exchange to peer certificate chain.
   */
  accessToken: string;

  /**
   * The SHA-256 digest of the DER encoded peer leaf certificate. It is a `:` separated hexadecimal string.
   */
  peerCertificateFingerprint256: string;
}

/**
 * Parses request's `Authorization` HTTP header if present and extracts authentication scheme.
 * @param request Request instance to extract authentication scheme for.
 */
function getRequestAuthenticationScheme(request: KibanaRequest) {
  const authorization = request.headers.authorization;
  if (!authorization || typeof authorization !== 'string') {
    return '';
  }

  return authorization.split(/\s+/)[0].toLowerCase();
}

/**
 * Provider that supports PKI request authentication.
 */
export class PKIAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Performs PKI request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to authenticate user request to ${request.url.path}.`);

    const authenticationScheme = getRequestAuthenticationScheme(request);
    if (authenticationScheme && authenticationScheme !== 'bearer') {
      this.logger.debug(`Unsupported authentication scheme: ${authenticationScheme}`);
      return AuthenticationResult.notHandled();
    }

    let authenticationResult = AuthenticationResult.notHandled();
    if (authenticationScheme) {
      // We should get rid of `Bearer` scheme support as soon as Reporting doesn't need it anymore.
      authenticationResult = await this.authenticateWithBearerScheme(request);
    }

    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this.authenticateViaState(request, state);

      // If access token expired or doesn't match to the certificate fingerprint we should try to get
      // a new one in exchange to peer certificate chain.
      if (
        authenticationResult.notHandled() ||
        (authenticationResult.failed() &&
          Tokens.isAccessTokenExpiredError(authenticationResult.error))
      ) {
        authenticationResult = await this.authenticateViaPeerCertificate(request);
        // If we have an active session that we couldn't use to authenticate user and at the same time
        // we couldn't use peer's certificate to establish a new one, then we should respond with 401
        // and force authenticator to clear the session.
        if (authenticationResult.notHandled()) {
          return AuthenticationResult.failed(Boom.unauthorized());
        }
      }
    }

    // If we couldn't authenticate by means of all methods above, let's try to check if we can authenticate
    // request using its peer certificate chain, otherwise just return authentication result we have.
    return authenticationResult.notHandled()
      ? await this.authenticateViaPeerCertificate(request)
      : authenticationResult;
  }

  /**
   * Invalidates access token retrieved in exchange for peer certificate chain if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to log user out via ${request.url.path}.`);

    if (!state) {
      this.logger.debug('There is no access token to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      await this.options.tokens.invalidate({ accessToken: state.accessToken });
    } catch (err) {
      this.logger.debug(`Failed invalidating access token: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }

    return DeauthenticationResult.redirectTo(`${this.options.basePath.serverBasePath}/logged_out`);
  }

  /**
   * Tries to authenticate request with `Bearer ***` Authorization header by passing it to the Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateWithBearerScheme(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate request using "Bearer" authentication scheme.');

    try {
      const user = await this.getUser(request);

      this.logger.debug('Request has been authenticated using "Bearer" authentication scheme.');
      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate request using "Bearer" authentication scheme: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to extract access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(
    request: KibanaRequest,
    { accessToken, peerCertificateFingerprint256 }: ProviderState
  ) {
    this.logger.debug('Trying to authenticate via state.');

    // If peer is authorized, but its certificate isn't available, that likely means the connection
    // with the peer is closed already. We shouldn't invalidate peer's access token in this case
    // since we cannot guarantee that there is a mismatch in access token and peer certificate.
    const peerCertificate = request.socket.getPeerCertificate(true);
    if (peerCertificate === null && request.socket.authorized) {
      this.logger.debug(
        'Cannot validate state access token with the peer certificate since it is not available.'
      );
      return AuthenticationResult.failed(new Error('Peer certificate is not available'));
    }

    if (
      !request.socket.authorized ||
      peerCertificate === null ||
      (peerCertificate as any).fingerprint256 !== peerCertificateFingerprint256
    ) {
      this.logger.debug(
        'Peer certificate is not present or its fingerprint does not match to the one associated with the access token. Invalidating access token...'
      );

      try {
        await this.options.tokens.invalidate({ accessToken });
      } catch (err) {
        this.logger.debug(`Failed to invalidate access token: ${err.message}`);
        return AuthenticationResult.failed(err);
      }

      // Return "Not Handled" result to allow provider to try to exchange new peer certificate chain
      // to the new access token down the line.
      return AuthenticationResult.notHandled();
    }

    try {
      const authHeaders = { authorization: `Bearer ${accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via state: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to exchange peer certificate chain to access/refresh token pair.
   * @param request Request instance.
   */
  private async authenticateViaPeerCertificate(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate request via peer certificate chain.');

    if (!request.socket.authorized) {
      this.logger.debug(
        `Authentication is not possible since peer certificate was not authorized: ${request.socket.authorizationError}.`
      );
      return AuthenticationResult.notHandled();
    }

    const peerCertificate = request.socket.getPeerCertificate(true);
    if (peerCertificate === null) {
      this.logger.debug('Authentication is not possible due to missing peer certificate chain.');
      return AuthenticationResult.notHandled();
    }

    // We should collect entire certificate chain as an ordered array of certificates encoded as base64 strings.
    const certificateChain = this.getCertificateChain(peerCertificate);
    let accessToken: string;
    try {
      accessToken = (
        await this.options.client.callAsInternalUser('shield.delegatePKI', {
          body: { x509_certificate_chain: certificateChain },
        })
      ).access_token;
    } catch (err) {
      this.logger.debug(
        `Failed to exchange peer certificate chain to an access token: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }

    this.logger.debug('Successfully retrieved access token in exchange to peer certificate chain.');

    try {
      // Then attempt to query for the user details using the new token
      const authHeaders = { authorization: `Bearer ${accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('User has been authenticated with new access token');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        state: {
          accessToken,
          // NodeJS typings don't include `fingerprint256` yet.
          peerCertificateFingerprint256: (peerCertificate as any).fingerprint256,
        },
      });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via access token: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Starts from the leaf peer certificate and iterates up to the top-most available certificate
   * authority using `issuerCertificate` certificate property. THe iteration is stopped only when
   * we detect circular reference (root/self-signed certificate) or when `issuerCertificate` isn't
   * available (null or empty object).
   * @param peerCertificate Peer leaf certificate instance.
   */
  private getCertificateChain(peerCertificate: DetailedPeerCertificate | null) {
    const certificateChain = [];
    let certificate: DetailedPeerCertificate | null = peerCertificate;
    while (certificate !== null && Object.keys(certificate).length > 0) {
      certificateChain.push(certificate.raw.toString('base64'));

      // For self-signed certificates, `issuerCertificate` may be a circular reference.
      if (certificate === certificate.issuerCertificate) {
        this.logger.debug('Self-signed certificate is detected in certificate chain');
        certificate = null;
      } else {
        certificate = certificate.issuerCertificate;
      }
    }

    this.logger.debug(
      `Peer certificate chain consists of ${certificateChain.length} certificates.`
    );

    return certificateChain;
  }
}
