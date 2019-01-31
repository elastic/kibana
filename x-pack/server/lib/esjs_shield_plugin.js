/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function addExtensions(client) {
  /**
   * Perform a [shield.authenticate](Retrieve details about the currently authenticated user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   */
  client.extend('shield.authenticate', ({ makeRequest }) => {
    return function shieldAuthenticate(params, options) {
      // build request object
      const request = {
        method: 'GET',
        path: '/_security/_authenticate',
        body: null,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.changePassword](Change the password of a user) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.username - The username of the user to change the password for
   */
  client.extend('shield.changePassword', ({ makeRequest, ConfigurationError }) => {
    return function shieldChangePassword(params, options) {
      const {
        username,
        body,
        ...querystring
      } = params;

      if (body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: typeof username === 'string'
          ? `/_security/user/${encodeURIComponent(username)}/_password`
          : '/_security/user/_password',
        body,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.clearCachedRealms](Clears the internal user caches for specified realms) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String} params.usernames - Comma-separated list of usernames to clear from the cache
   * @param {String} params.realms - Comma-separated list of realms to clear
   */
  client.extend('shield.clearCachedRealms', ({ makeRequest, ConfigurationError }) => {
    return function shieldClearCachedRealms(params, options) {
      const {
        realms,
        ...querystring
      } = params;

      if (realms == null) {
        throw new ConfigurationError('Missing required parameter: realms');
      }

      // build request object
      const request = {
        method: 'POST',
        path: `/_security/realm/${encodeURIComponent(realms)}/_clear_cache`,
        body: '',
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.clearCachedRoles](Clears the internal caches for specified roles) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String} params.name - Role name
   */
  client.extend('shield.clearCachedRoles', ({ makeRequest, ConfigurationError }) => {
    return function shieldClearCachedRoles(params, options) {
      if (params.name == null) {
        throw new ConfigurationError('Missing required parameter: name');
      }

      // build request object
      const request = {
        method: 'POST',
        path: `/_security/role/${encodeURIComponent(params.name)}/_clear_cache`,
        body: '',
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.deleteRole](Remove a role from the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.name - Role name
   */
  client.extend('shield.deleteRole', ({ makeRequest, ConfigurationError }) => {
    return function shieldDeleteRole(params, options) {
      const {
        username,
        ...querystring
      } = params;

      if (username == null) {
        throw new ConfigurationError('Missing required parameter: username');
      }

      // build request object
      const request = {
        method: 'DELETE',
        path: `/_security/role/${encodeURIComponent(username)}`,
        body: null,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.deleteUser](Remove a user from the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.username - username
   */
  client.extend('shield.deleteUser', ({ makeRequest, ConfigurationError }) => {
    return function shieldDeleteUser(params, options) {
      const {
        username,
        ...querystring
      } = params;

      if (username == null) {
        throw new ConfigurationError('Missing required parameter: username');
      }

      // build request object
      const request = {
        method: 'DELETE',
        path: `/_security/user/${encodeURIComponent(username)}`,
        body: null,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.getRole](Retrieve one or more roles from the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String} params.name - Role name
   */
  client.extend('shield.getRole', ({ makeRequest }) => {
    return function shieldGetRole(params, options) {
      // build request object
      const request = {
        method: 'GET',
        path: typeof params.name === 'string'
          ? `/_security/role/${encodeURIComponent(params.name)}`
          : '/_security/role',
        body: null,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.getUser](Retrieve one or more users from the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {String, String[], Boolean} params.username - A comma-separated list of usernames
   */
  client.extend('shield.getUser', ({ makeRequest }) => {
    return function shieldGetUser(params, options) {
      // build request object
      const request = {
        method: 'GET',
        path: typeof params.username === 'string'
          ? `/_security/user/${encodeURIComponent(params.username)}`
          : '/_security/user',
        body: null,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.putRole](Update or create a role for the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.name - Role name
   */
  client.extend('shield.putRole', ({ makeRequest, ConfigurationError }) => {
    return function shieldPutRole(params, options) {
      const {
        name,
        body,
        ...querystring
      } = params;

      if (name == null) {
        throw new ConfigurationError('Missing required parameter: name');
      }

      if (body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'PUT',
        path: `/_security/role/${encodeURIComponent(name)}`,
        body,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.putUser](Update or create a user for the native shield realm) request
   *
   * @param {Object} params - An object with parameters used to carry out this action
   * @param {Boolean} params.refresh - Refresh the index after performing the operation
   * @param {String} params.username - The username of the User
   */
  client.extend('shield.putUser', ({ makeRequest, ConfigurationError }) => {
    return function shieldPutUser(params, options) {
      const {
        username,
        body,
        ...querystring
      } = params;

      if (username == null) {
        throw new ConfigurationError('Missing required parameter: username');
      }

      if (body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'PUT',
        path: `/_security/user/${encodeURIComponent(username)}`,
        body,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Perform a [shield.getUserPrivileges](Retrieve a user's list of privileges) request
   *
   */
  client.extend('shield.getUserPrivileges', ({ makeRequest }) => {
    return function shieldGetUserPrivileges(params, options) {
      // build request object
      const request = {
        method: 'GET',
        path: '/_security/user/_privileges',
        body: null,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Asks Elasticsearch to prepare SAML authentication request to be sent to
   * the 3rd-party SAML identity provider.
   *
   * @param {string} acs Assertion consumer service URL to use for SAML request or URL in the
   * Kibana to which identity provider will post SAML response. Based on the ACS Elasticsearch
   * will choose the right SAML realm.
   *
   * @returns {{realm: string, id: string, redirect: string}} Object that includes identifier
   * of the SAML realm used to prepare authentication request, encrypted request token to be
   * sent to Elasticsearch with SAML response and redirect URL to the identity provider that
   * will be used to authenticate user.
   */
  client.extend('shield.samlPrepare', ({ makeRequest, ConfigurationError }) => {
    return function shieldSamlPrepare(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/saml/prepare',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Sends SAML response returned by identity provider to Elasticsearch for validation.
   *
   * @param {Array.<string>} ids A list of encrypted request tokens returned within SAML
   * preparation response.
   * @param {string} content SAML response returned by identity provider.
   *
   * @returns {{username: string, access_token: string, expires_in: number}} Object that
   * includes name of the user, access token to use for any consequent requests that
   * need to be authenticated and a number of seconds after which access token will expire.
   */
  client.extend('shield.samlAuthenticate', ({ makeRequest, ConfigurationError }) => {
    return function shieldSamlPrepare(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/saml/authenticate',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Invalidates SAML access token.
   *
   * @param {string} token SAML access token that needs to be invalidated.
   *
   * @returns {{redirect?: string}}
   */
  client.extend('shield.samlLogout', ({ makeRequest, ConfigurationError }) => {
    return function shieldSamlLogout(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/saml/logout',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Invalidates SAML session based on Logout Request received from the Identity Provider.
   *
   * @param {string} queryString URL encoded query string provided by Identity Provider.
   * @param {string} acs Assertion consumer service URL to use for SAML request or URL in the
   * Kibana to which identity provider will post SAML response. Based on the ACS Elasticsearch
   * will choose the right SAML realm to invalidate session.
   *
   * @returns {{redirect?: string}}
   */
  client.extend('shield.samlInvalidate', ({ makeRequest, ConfigurationError }) => {
    return function shieldSamlInvalidate(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/saml/invalidate',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Refreshes an access token.
   *
   * @param {string} grant_type Currently only "refresh_token" grant type is supported.
   * @param {string} refresh_token One-time refresh token that will be exchanged to the new access/refresh token pair.
   *
   * @returns {{access_token: string, type: string, expires_in: number, refresh_token: string}}
   */
  client.extend('shield.getAccessToken', ({ makeRequest, ConfigurationError }) => {
    return function shieldGetAccessToken(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/oauth2/token',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  /**
   * Invalidates an access token.
   *
   * @param {string} token The access token to invalidate
   *
   * @returns {{created: boolean}}
   */
  client.extend('shield.deleteAccessToken', ({ makeRequest, ConfigurationError }) => {
    return function shieldDeleteAccessToken(params, options) {
      const {
        body,
        ...querystring
      } = params;

      if (body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'DELETE',
        path: '/_security/oauth2/token',
        body,
        querystring
      };

      return makeRequest(request, options);
    };
  });

  client.extend('shield.getPrivilege', ({ makeRequest }) => {
    return function shieldGetPrivilege(params, options) {
      // build request object
      const request = {
        method: 'GET',
        path: typeof params.privilege === 'string'
          ? `/_security/privilege/${encodeURIComponent(params.privilege)}`
          : '/_security/privilege',
        body: null,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  client.extend('shield.deletePrivilege', ({ makeRequest, ConfigurationError }) => {
    return function shieldDeletePrivilege(params, options) {
      if (params.application == null) {
        throw new ConfigurationError('Missing required parameter: application');
      }

      if (params.privilege == null) {
        throw new ConfigurationError('Missing required parameter: privilege');
      }

      // build request object
      const request = {
        method: 'DELETE',
        path: `/_security/privilege/${encodeURIComponent(params.application)}/${encodeURIComponent(params.privilege)}`,
        body: '',
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  client.extend('shield.postPrivileges', ({ makeRequest, ConfigurationError }) => {
    return function shieldPostPrivileges(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/privilege',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });

  client.extend('shield.hasPrivileges', ({ makeRequest, ConfigurationError }) => {
    return function shieldHasPrivileges(params, options) {
      if (params.body == null) {
        throw new ConfigurationError('Missing required parameter: body');
      }

      // build request object
      const request = {
        method: 'POST',
        path: '/_security/user/_has_privileges',
        body: params.body,
        querystring: {}
      };

      return makeRequest(request, options);
    };
  });
}
