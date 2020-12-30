/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function elasticsearchClientPlugin(Client: any, config: unknown, components: any) {
  const ca = components.clientAction.factory;

  Client.prototype.shield = components.clientAction.namespaceFactory();
  const shield = Client.prototype.shield.prototype;

  /**
   * Perform a [shield.authenticate](Retrieve details about the currently authenticated user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  shield.authenticate = ca({
    params: {},
    url: {
      fmt: '/_security/_authenticate',
    },
  });

  /**
   * Asks Elasticsearch to prepare SAML authentication request to be sent to
   * the 3rd-party SAML identity provider.
   *
   * @param {string} [acs] Optional assertion consumer service URL to use for SAML request or URL
   * in the Kibana to which identity provider will post SAML response. Based on the ACS Elasticsearch
   * will choose the right SAML realm.
   *
   * @param {string} [realm] Optional name of the Elasticsearch SAML realm to use to handle request.
   *
   * @returns {{realm: string, id: string, redirect: string}} Object that includes identifier
   * of the SAML realm used to prepare authentication request, encrypted request token to be
   * sent to Elasticsearch with SAML response and redirect URL to the identity provider that
   * will be used to authenticate user.
   */
  shield.samlPrepare = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/saml/prepare',
    },
  });

  /**
   * Sends SAML response returned by identity provider to Elasticsearch for validation.
   *
   * @param {Array.<string>} ids A list of encrypted request tokens returned within SAML
   * preparation response.
   * @param {string} content SAML response returned by identity provider.
   * @param {string} [realm] Optional string used to identify the name of the OpenID Connect realm
   * that should be used to authenticate request.
   *
   * @returns {{username: string, access_token: string, expires_in: number}} Object that
   * includes name of the user, access token to use for any consequent requests that
   * need to be authenticated and a number of seconds after which access token will expire.
   */
  shield.samlAuthenticate = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/saml/authenticate',
    },
  });

  /**
   * Invalidates SAML access token.
   *
   * @param {string} token SAML access token that needs to be invalidated.
   *
   * @returns {{redirect?: string}}
   */
  shield.samlLogout = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/saml/logout',
    },
  });

  /**
   * Invalidates SAML session based on Logout Request received from the Identity Provider.
   *
   * @param {string} queryString URL encoded query string provided by Identity Provider.
   * @param {string} [acs] Optional assertion consumer service URL to use for SAML request or URL in the
   * Kibana to which identity provider will post SAML response. Based on the ACS Elasticsearch
   * will choose the right SAML realm to invalidate session.
   * @param {string} [realm] Optional name of the Elasticsearch SAML realm to use to handle request.
   *
   * @returns {{redirect?: string}}
   */
  shield.samlInvalidate = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/saml/invalidate',
    },
  });

  /**
   * Asks Elasticsearch to prepare an OpenID Connect authentication request to be sent to
   * the 3rd-party OpenID Connect provider.
   *
   * @param {string} realm The OpenID Connect realm name in Elasticsearch
   *
   * @returns {{state: string, nonce: string, redirect: string}} Object that includes two opaque parameters that need
   * to be sent to Elasticsearch with the OpenID Connect response and redirect URL to the OpenID Connect provider that
   * will be used to authenticate user.
   */
  shield.oidcPrepare = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/oidc/prepare',
    },
  });

  /**
   * Sends the URL to which the OpenID Connect Provider redirected the UA to Elasticsearch for validation.
   *
   * @param {string} state The state parameter that was returned by Elasticsearch in the
   * preparation response.
   * @param {string} nonce The nonce parameter that was returned by Elasticsearch in the
   * preparation response.
   * @param {string} redirect_uri The URL to where the UA was redirected by the OpenID Connect provider.
   * @param {string} [realm] Optional string used to identify the name of the OpenID Connect realm
   * that should be used to authenticate request.
   *
   * @returns {{username: string, access_token: string, refresh_token; string, expires_in: number}} Object that
   * includes name of the user, access token to use for any consequent requests that
   * need to be authenticated and a number of seconds after which access token will expire.
   */
  shield.oidcAuthenticate = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/oidc/authenticate',
    },
  });

  /**
   * Invalidates an access token and refresh token pair that was generated after an OpenID Connect authentication.
   *
   * @param {string} token An access token that was created by authenticating to an OpenID Connect realm and
   * that needs to be invalidated.
   * @param {string} refresh_token A refresh token that was created by authenticating to an OpenID Connect realm and
   * that needs to be invalidated.
   *
   * @returns {{redirect?: string}} If the Elasticsearch OpenID Connect realm configuration and the
   * OpenID Connect provider supports RP-initiated SLO, a URL to redirect the UA
   */
  shield.oidcLogout = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/oidc/logout',
    },
  });

  /**
   * Refreshes an access token.
   *
   * @param {string} grant_type Currently only "refresh_token" grant type is supported.
   * @param {string} refresh_token One-time refresh token that will be exchanged to the new access/refresh token pair.
   *
   * @returns {{access_token: string, type: string, expires_in: number, refresh_token: string}}
   */
  shield.getAccessToken = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/oauth2/token',
    },
  });

  /**
   * Invalidates an access token.
   *
   * @param {string} token The access token to invalidate
   *
   * @returns {{created: boolean}}
   */
  shield.deleteAccessToken = ca({
    method: 'DELETE',
    needBody: true,
    params: {
      token: {
        type: 'string',
      },
    },
    url: {
      fmt: '/_security/oauth2/token',
    },
  });

  /**
   * Gets an access token in exchange to the certificate chain for the target subject distinguished name.
   *
   * @param {string[]} x509_certificate_chain An ordered array of base64-encoded (Section 4 of RFC4648 - not
   * base64url-encoded) DER PKIX certificate values.
   *
   * @returns {{access_token: string, type: string, expires_in: number}}
   */
  shield.delegatePKI = ca({
    method: 'POST',
    needBody: true,
    url: {
      fmt: '/_security/delegate_pki',
    },
  });
}
