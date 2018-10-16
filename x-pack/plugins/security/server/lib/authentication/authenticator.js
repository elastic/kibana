/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { AuthScopeService } from '../auth_scope_service';
import { BasicAuthenticationProvider } from './providers/basic';
import { SAMLAuthenticationProvider } from './providers/saml';
import { AuthenticationResult } from './authentication_result';
import { DeauthenticationResult } from './deauthentication_result';
import { Session } from './session';

// Mapping between provider key defined in the config and authentication
// provider class that can handle specific authentication mechanism.
const providerMap = new Map([
  ['basic', BasicAuthenticationProvider],
  ['saml', SAMLAuthenticationProvider]
]);

function assertRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error(`Request should be a valid object, was [${typeof request}].`);
  }
}

/**
 * Prepares options object that is shared among all authentication providers.
 * @param {Hapi.Server} server HapiJS Server instance.
 * @returns {Object}
 */
function getProviderOptions(server) {
  const config = server.config();

  return {
    client: getClient(server),
    log: server.log.bind(server),

    protocol: server.info.protocol,
    hostname: config.get('server.host'),
    port: config.get('server.port'),
    basePath: config.get('server.basePath'),

    ...config.get('xpack.security.public')
  };
}

/**
 * Extracts error code from Boom and Elasticsearch "native" errors.
 * @param {Error} error Error instance to extract status code from.
 * @returns {number}
 */
function getErrorStatusCode(error) {
  return error.isBoom ? error.output.statusCode : error.statusCode;
}

/**
 * Authenticator is responsible for authentication of the request using chain of
 * authentication providers. The chain is essentially a prioritized list of configured
 * providers (typically of various types). The order of the list determines the order in
 * which the providers will be consulted. During the authentication process, Authenticator
 * will try to authenticate the request via one provider at a time. Once one of the
 * providers successfully authenticates the request, the authentication is considered
 * to be successful and the authenticated user will be associated with the request.
 * If provider cannot authenticate the request, the next in line provider in the chain
 * will be used. If all providers in the chain could not authenticate the request,
 * the authentication is then considered to be unsuccessful and an authentication error
 * will be returned.
 */
class Authenticator {
  /**
   * HapiJS server instance.
   * @type {Hapi.Server}
   * @private
   */
  _server = null;

  /**
   * Service that gathers all `scopes` for particular user.
   * @type {AuthScopeService}
   * @private
   */
  _authScope = null;

  /**
   * List of configured and instantiated authentication providers.
   * @type {Map.<string, Object>}
   * @private
   */
  _providers = null;

  /**
   * Session class instance.
   * @type {Session}
   * @private
   */
  _session = null;

  /**
   * Instantiates Authenticator and bootstrap configured providers.
   * @param {Hapi.Server} server HapiJS Server instance.
   * @param {AuthScopeService} authScope AuthScopeService instance.
   * @param {Session} session Session instance.
   * @param {AuthorizationMode} authorizationMode AuthorizationMode instance
   */
  constructor(server, authScope, session, authorizationMode) {
    this._server = server;
    this._authScope = authScope;
    this._session = session;
    this._authorizationMode = authorizationMode;

    const config = this._server.config();
    const authProviders = config.get('xpack.security.authProviders');
    if (authProviders.length === 0) {
      throw new Error(
        'No authentication provider is configured. Verify `xpack.security.authProviders` config value.'
      );
    }

    const providerOptions = Object.freeze(getProviderOptions(server));

    this._providers = new Map(
      authProviders.map(
        (providerType) => [providerType, this._instantiateProvider(providerType, providerOptions)]
      )
    );
  }

  /**
   * Performs request authentication using configured chain of authentication providers.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}.
   */
  async authenticate(request) {
    assertRequest(request);

    const isSystemApiRequest = this._server.plugins.kibana.systemApi.isSystemApiRequest(request);
    const existingSession = await this._session.get(request);

    let authenticationResult;
    for (const [providerType, provider] of this._providerIterator(existingSession)) {
      // Check if current session has been set by this provider.
      const ownsSession = existingSession && existingSession.provider === providerType;

      authenticationResult = await provider.authenticate(
        request,
        ownsSession ? existingSession.state : null
      );

      if (ownsSession || authenticationResult.state) {
        // If authentication succeeds or requires redirect we should automatically extend existing user session,
        // unless authentication has been triggered by a system API request. In case provider explicitly returns new
        // state we should store it in the session regardless of whether it's a system API request or not.
        const sessionCanBeUpdated = (authenticationResult.succeeded() || authenticationResult.redirected())
          && (authenticationResult.state || !isSystemApiRequest);

        // If provider owned the session, but failed to authenticate anyway, that likely means
        // that session is not valid and we should clear it.
        if (authenticationResult.failed() && getErrorStatusCode(authenticationResult.error) === 401) {
          await this._session.clear(request);
        } else if (sessionCanBeUpdated) {
          await this._session.set(
            request,
            authenticationResult.state
              ? { state: authenticationResult.state, provider: providerType }
              : existingSession
          );
        }
      }

      if (authenticationResult.succeeded()) {
        // we have to do this here, as the auth scope's could be dependent on this
        await this._authorizationMode.initialize(request);
        return AuthenticationResult.succeeded({
          ...authenticationResult.user,
          // Complement user returned from the provider with scopes.
          scope: await this._authScope.getForRequestAndUser(request, authenticationResult.user)
        });
      } else if (authenticationResult.redirected()) {
        return authenticationResult;
      }
    }

    return authenticationResult;
  }

  /**
   * Deauthenticates current request.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<DeauthenticationResult>}
   */
  async deauthenticate(request) {
    assertRequest(request);

    const sessionValue = await this._getSessionValue(request);
    if (sessionValue) {
      await this._session.clear(request);

      return this._providers.get(sessionValue.provider).deauthenticate(request, sessionValue.state);
    }

    // Normally when there is no active session in Kibana, `deauthenticate` method shouldn't do anything
    // and user will eventually be redirected to the home page to log in. But if SAML is supported there
    // is a special case when logout is initiated by the IdP or another SP, then IdP will request _every_
    // SP associated with the current user session to do the logout. So if Kibana (without active session)
    // receives such a request it shouldn't redirect user to the home page, but rather redirect back to IdP
    // with correct logout response and only Elasticsearch knows how to do that.
    if (request.query.SAMLRequest && this._providers.has('saml')) {
      return this._providers.get('saml').deauthenticate(request);
    }

    return DeauthenticationResult.notHandled();
  }

  /**
   * Instantiates authentication provider based on the provider key from config.
   * @param {string} providerType Provider type key.
   * @param {Object} options Options to pass to provider's constructor.
   * @returns {Object} Authentication provider instance.
   * @private
   */
  _instantiateProvider(providerType, options) {
    const ProviderClassName = providerMap.get(providerType);
    if (!ProviderClassName) {
      throw new Error(`Unsupported authentication provider name: ${providerType}.`);
    }

    return new ProviderClassName(options);
  }

  /**
   * Returns provider iterator where providers are sorted in the order of priority (based on the session ownership).
   * @param {Object} sessionValue Current session value.
   * @returns {Iterator.<Object>}
   */
  *_providerIterator(sessionValue) {
    // If there is no session to predict which provider to use first, let's use the order
    // providers are configured in. Otherwise return provider that owns session first, and only then the rest
    // of providers.
    if (!sessionValue) {
      yield* this._providers;
    } else {
      yield [sessionValue.provider, this._providers.get(sessionValue.provider)];

      for (const [providerType, provider] of this._providers) {
        if (providerType !== sessionValue.provider) {
          yield [providerType, provider];
        }
      }
    }
  }

  /**
   * Extracts session value for the specified request. Under the hood it can
   * clear session if it belongs to the provider that is not available.
   * @param {Hapi.Request} request Request to extract session value for.
   * @returns {Promise.<Object|null>}
   * @private
   */
  async _getSessionValue(request) {
    let sessionValue = await this._session.get(request);

    // If for some reason we have a session stored for the provider that is not available
    // (e.g. when user was logged in with one provider, but then configuration has changed
    // and that provider is no longer available), then we should clear session entirely.
    if (sessionValue && !this._providers.has(sessionValue.provider)) {
      await this._session.clear(request);
      sessionValue = null;
    }

    return sessionValue;
  }
}

export async function initAuthenticator(server, authorizationMode) {
  const session = await Session.create(server);
  const authScope = new AuthScopeService();
  const authenticator = new Authenticator(server, authScope, session, authorizationMode);

  server.expose('authenticate', (request) => authenticator.authenticate(request));
  server.expose('deauthenticate', (request) => authenticator.deauthenticate(request));
  server.expose('registerAuthScopeGetter', (scopeExtender) => authScope.registerGetter(scopeExtender));

  server.expose('isAuthenticated', async (request) => {
    try {
      await server.plugins.security.getUser(request);
      return true;
    } catch (err) {
      // Don't swallow server errors.
      if (!err.isBoom || err.output.statusCode !== 401) {
        throw err;
      }
    }

    return false;
  });
}
