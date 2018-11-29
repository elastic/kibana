/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) { // eslint-disable-line no-undef
    define([], factory); // eslint-disable-line no-undef
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ElasticsearchShield = factory();
  }
}(this, function () {
  return function addShieldApi(Client, config, components) {
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
        fmt: '/_xpack/security/_authenticate'
      }
    });

    /**
     * Perform a [shield.changePassword](Change the password of a user) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {Boolean} params.refresh - Refresh the index after performing the operation
     * @param {String} params.username - The username of the user to change the password for
     */
    shield.changePassword = ca({
      params: {
        refresh: {
          type: 'boolean'
        }
      },
      urls: [
        {
          fmt: '/_xpack/security/user/<%=username%>/_password',
          req: {
            username: {
              type: 'string',
              required: false
            }
          }
        },
        {
          fmt: '/_xpack/security/user/_password'
        }
      ],
      needBody: true,
      method: 'POST'
    });

    /**
     * Perform a [shield.clearCachedRealms](Clears the internal user caches for specified realms) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {String} params.usernames - Comma-separated list of usernames to clear from the cache
     * @param {String} params.realms - Comma-separated list of realms to clear
     */
    shield.clearCachedRealms = ca({
      params: {
        usernames: {
          type: 'string',
          required: false
        }
      },
      url: {
        fmt: '/_xpack/security/realm/<%=realms%>/_clear_cache',
        req: {
          realms: {
            type: 'string',
            required: true
          }
        }
      },
      method: 'POST'
    });

    /**
     * Perform a [shield.clearCachedRoles](Clears the internal caches for specified roles) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {String} params.name - Role name
     */
    shield.clearCachedRoles = ca({
      params: {},
      url: {
        fmt: '/_xpack/security/role/<%=name%>/_clear_cache',
        req: {
          name: {
            type: 'string',
            required: true
          }
        }
      },
      method: 'POST'
    });

    /**
     * Perform a [shield.deleteRole](Remove a role from the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {Boolean} params.refresh - Refresh the index after performing the operation
     * @param {String} params.name - Role name
     */
    shield.deleteRole = ca({
      params: {
        refresh: {
          type: 'boolean'
        }
      },
      url: {
        fmt: '/_xpack/security/role/<%=name%>',
        req: {
          name: {
            type: 'string',
            required: true
          }
        }
      },
      method: 'DELETE'
    });

    /**
     * Perform a [shield.deleteUser](Remove a user from the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {Boolean} params.refresh - Refresh the index after performing the operation
     * @param {String} params.username - username
     */
    shield.deleteUser = ca({
      params: {
        refresh: {
          type: 'boolean'
        }
      },
      url: {
        fmt: '/_xpack/security/user/<%=username%>',
        req: {
          username: {
            type: 'string',
            required: true
          }
        }
      },
      method: 'DELETE'
    });

    /**
     * Perform a [shield.getRole](Retrieve one or more roles from the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {String} params.name - Role name
     */
    shield.getRole = ca({
      params: {},
      urls: [
        {
          fmt: '/_xpack/security/role/<%=name%>',
          req: {
            name: {
              type: 'string',
              required: false
            }
          }
        },
        {
          fmt: '/_xpack/security/role'
        }
      ]
    });

    /**
     * Perform a [shield.getUser](Retrieve one or more users from the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {String, String[], Boolean} params.username - A comma-separated list of usernames
     */
    shield.getUser = ca({
      params: {},
      urls: [
        {
          fmt: '/_xpack/security/user/<%=username%>',
          req: {
            username: {
              type: 'list',
              required: false
            }
          }
        },
        {
          fmt: '/_xpack/security/user'
        }
      ]
    });

    /**
     * Perform a [shield.putRole](Update or create a role for the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {Boolean} params.refresh - Refresh the index after performing the operation
     * @param {String} params.name - Role name
     */
    shield.putRole = ca({
      params: {
        refresh: {
          type: 'boolean'
        }
      },
      url: {
        fmt: '/_xpack/security/role/<%=name%>',
        req: {
          name: {
            type: 'string',
            required: true
          }
        }
      },
      needBody: true,
      method: 'PUT'
    });

    /**
     * Perform a [shield.putUser](Update or create a user for the native shield realm) request
     *
     * @param {Object} params - An object with parameters used to carry out this action
     * @param {Boolean} params.refresh - Refresh the index after performing the operation
     * @param {String} params.username - The username of the User
     */
    shield.putUser = ca({
      params: {
        refresh: {
          type: 'boolean'
        }
      },
      url: {
        fmt: '/_xpack/security/user/<%=username%>',
        req: {
          username: {
            type: 'string',
            required: true
          }
        }
      },
      needBody: true,
      method: 'PUT'
    });

    /**
     * Perform a [shield.getUserPrivileges](Retrieve a user's list of privileges) request
     *
     */
    shield.getUserPrivileges = ca({
      params: {},
      urls: [
        {
          fmt: '/_xpack/security/user/_privileges'
        }
      ]
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
    shield.samlPrepare = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/saml/prepare'
      }
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
    shield.samlAuthenticate = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/saml/authenticate'
      }
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
        fmt: '/_xpack/security/saml/logout'
      }
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
        fmt: '/_xpack/security/saml/logout'
      }
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
    shield.samlInvalidate = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/saml/invalidate'
      }
    });

    /**
     * Refreshes SAML access token.
     *
     * @param {string} grant_type Currently only "refresh_token" grant type is supported.
     * @param {string} refresh_token One-time refresh token that will be exchanged to the new access/refresh token pair.
     *
     * @returns {{access_token: string, type: string, expires_in: number, refresh_token: string}}
     */
    shield.samlRefreshAccessToken = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/oauth2/token'
      }
    });

    shield.getPrivilege = ca({
      method: 'GET',
      urls: [{
        fmt: '/_xpack/security/privilege/<%=privilege%>',
        req: {
          privilege: {
            type: 'string',
            required: false
          }
        }
      }, {
        fmt: '/_xpack/security/privilege'
      }]
    });

    shield.deletePrivilege = ca({
      method: 'DELETE',
      urls: [{
        fmt: '/_xpack/security/privilege/<%=application%>/<%=privilege%>',
        req: {
          application: {
            type: 'string',
            required: true
          },
          privilege: {
            type: 'string',
            required: true
          }
        }
      }]
    });

    shield.postPrivileges = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/privilege'
      }
    });

    shield.hasPrivileges = ca({
      method: 'POST',
      needBody: true,
      url: {
        fmt: '/_xpack/security/user/_has_privileges'
      }
    });
  };
}));
