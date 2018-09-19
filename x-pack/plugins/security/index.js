/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { getUserProvider } from './server/lib/get_user';
import { initAuthenticateApi } from './server/routes/api/v1/authenticate';
import { initUsersApi } from './server/routes/api/v1/users';
import { initPublicRolesApi } from './server/routes/api/public/roles';
import { initIndicesApi } from './server/routes/api/v1/indices';
import { initLoginView } from './server/routes/views/login';
import { initLogoutView } from './server/routes/views/logout';
import { validateConfig } from './server/lib/validate_config';
import { authenticateFactory } from './server/lib/auth_redirect';
import { checkLicense } from './server/lib/check_license';
import { initAuthenticator } from './server/lib/authentication/authenticator';
import { initPrivilegesApi } from './server/routes/api/v1/privileges';
import { SecurityAuditLogger } from './server/lib/audit_logger';
import { AuditLogger } from '../../server/lib/audit_logger';
import { SecureSavedObjectsClient } from './server/lib/saved_objects_client/secure_saved_objects_client';
import { initAuthorizationService, registerPrivilegesWithCluster } from './server/lib/authorization';
import { watchStatusAndLicenseToInitialize } from './server/lib/watch_status_and_license_to_initialize';

export const security = (kibana) => new kibana.Plugin({
  id: 'security',
  configPrefix: 'xpack.security',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],

  config(Joi) {
    return Joi.object({
      authProviders: Joi.array().items(Joi.string()).default(['basic']),
      enabled: Joi.boolean().default(true),
      cookieName: Joi.string().default('sid'),
      encryptionKey: Joi.string(),
      sessionTimeout: Joi.number().allow(null).default(null),
      secureCookies: Joi.boolean().default(false),
      public: Joi.object({
        protocol: Joi.string().valid(['http', 'https']),
        hostname: Joi.string().hostname(),
        port: Joi.number().integer().min(0).max(65535)
      }).default(),
      authorization: Joi.object({
        legacyFallback: Joi.object({
          enabled: Joi.boolean().default(true)
        }).default()
      }).default(),
      audit: Joi.object({
        enabled: Joi.boolean().default(false)
      }).default(),
    }).default();
  },

  uiExports: {
    chromeNavControls: ['plugins/security/views/nav_control'],
    managementSections: ['plugins/security/views/management'],
    apps: [{
      id: 'login',
      title: 'Login',
      main: 'plugins/security/views/login',
      hidden: true,
    }, {
      id: 'logout',
      title: 'Logout',
      main: 'plugins/security/views/logout',
      hidden: true
    }],
    hacks: [
      'plugins/security/hacks/on_session_timeout',
      'plugins/security/hacks/on_unauthorized_response'
    ],
    home: ['plugins/security/register_feature'],
    injectDefaultVars: function (server) {
      const config = server.config();

      return {
        secureCookies: config.get('xpack.security.secureCookies'),
        sessionTimeout: config.get('xpack.security.sessionTimeout'),
      };
    }
  },

  async init(server) {
    const plugin = this;

    const config = server.config();
    const xpackMainPlugin = server.plugins.xpack_main;
    const xpackInfo = xpackMainPlugin.info;

    const xpackInfoFeature = xpackInfo.feature(plugin.id);

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackInfoFeature.registerLicenseCheckResultsGenerator(checkLicense);

    validateConfig(config, message => server.log(['security', 'warning'], message));

    // Create a Hapi auth scheme that should be applied to each request.
    server.auth.scheme('login', () => ({ authenticate: authenticateFactory(server) }));

    // The `required` means that the `session` strategy that is based on `login` schema defined above will be
    // automatically assigned to all routes that don't contain an auth config.
    server.auth.strategy('session', 'login', 'required');

    // exposes server.plugins.security.authorization
    initAuthorizationService(server);

    watchStatusAndLicenseToInitialize(xpackMainPlugin, plugin, async (license) => {
      if (license.allowRbac) {
        await registerPrivilegesWithCluster(server);
      }
    });

    const auditLogger = new SecurityAuditLogger(server.config(), new AuditLogger(server, 'security'));

    const { savedObjects } = server;
    savedObjects.setScopedSavedObjectsClientFactory(({
      request,
    }) => {
      const adminCluster = server.plugins.elasticsearch.getCluster('admin');
      const { callWithRequest, callWithInternalUser } = adminCluster;
      const callCluster = (...args) => callWithRequest(request, ...args);

      const callWithRequestRepository = savedObjects.getSavedObjectsRepository(callCluster);

      if (!xpackInfoFeature.getLicenseCheckResults().allowRbac) {
        return new savedObjects.SavedObjectsClient(callWithRequestRepository);
      }

      const { authorization } = server.plugins.security;
      const checkPrivileges = authorization.checkPrivilegesWithRequest(request);
      const internalRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);

      return new SecureSavedObjectsClient({
        internalRepository,
        callWithRequestRepository,
        errors: savedObjects.SavedObjectsClient.errors,
        checkPrivileges,
        auditLogger,
        actions: authorization.actions,
      });
    });

    getUserProvider(server);

    await initAuthenticator(server);
    initAuthenticateApi(server);
    initUsersApi(server);
    initPublicRolesApi(server);
    initIndicesApi(server);
    initPrivilegesApi(server);
    initLoginView(server, xpackMainPlugin);
    initLogoutView(server);

    server.injectUiAppVars('login', () => {
      const { showLogin, loginMessage, allowLogin, layout = 'form' } = xpackInfo.feature(plugin.id).getLicenseCheckResults() || {};

      return {
        loginState: {
          showLogin,
          allowLogin,
          loginMessage,
          layout,
        }
      };
    });
  }
});
