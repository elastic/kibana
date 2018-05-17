/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { getUserProvider } from './server/lib/get_user';
import { initAuthenticateApi } from './server/routes/api/v1/authenticate';
import { initUsersApi } from './server/routes/api/v1/users';
import { initRolesApi } from './server/routes/api/v1/roles';
import { initIndicesApi } from './server/routes/api/v1/indices';
import { initLoginView } from './server/routes/views/login';
import { initLogoutView } from './server/routes/views/logout';
import { validateConfig } from './server/lib/validate_config';
import { authenticateFactory } from './server/lib/auth_redirect';
import { checkLicense } from './server/lib/check_license';
import { initAuthenticator } from './server/lib/authentication/authenticator';
import { mirrorStatusAndInitialize } from './server/lib/mirror_status_and_initialize';
import { registerPrivilegesWithCluster } from './server/lib/privileges';
import { createDefaultRoles } from './server/lib/authorization/create_default_roles';
import { initPrivilegesApi } from './server/routes/api/v1/privileges';
import { hasPrivilegesWithServer } from './server/lib/authorization/has_privileges';
import { SecureSavedObjectsClient } from './server/lib/saved_objects_client/secure_saved_objects_client';

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
      rbac: Joi.object({
        enabled: Joi.boolean().default(false),
        createDefaultRoles: Joi.boolean().default(true),
        application: Joi.string().default('kibana').regex(
          /[a-zA-Z0-9-_]+/,
          `may contain alphanumeric characters (a-z, A-Z, 0-9), underscores and hyphens`
        ),
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
        rbacEnabled: config.get('xpack.security.rbac.enabled'),
        rbacApplication: config.get('xpack.security.rbac.application'),
      };
    }
  },

  async init(server) {
    const config = server.config();
    const xpackMainPlugin = server.plugins.xpack_main;

    mirrorStatusAndInitialize(xpackMainPlugin.status, this.status, async () => {
      if (!config.get('xpack.security.rbac.enabled')) {
        return;
      }

      await registerPrivilegesWithCluster(server);
      await createDefaultRoles(server);
    });

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(this.id).registerLicenseCheckResultsGenerator(checkLicense);

    validateConfig(config, message => server.log(['security', 'warning'], message));

    // Create a Hapi auth scheme that should be applied to each request.
    server.auth.scheme('login', () => ({ authenticate: authenticateFactory(server) }));

    // The `required` means that the `session` strategy that is based on `login` schema defined above will be
    // automatically assigned to all routes that don't contain an auth config.
    server.auth.strategy('session', 'login', 'required');

    if (config.get('xpack.security.rbac.enabled')) {
      const hasPrivilegesWithRequest = hasPrivilegesWithServer(server);
      const { savedObjects } = server;

      savedObjects.registerScopedSavedObjectsClientFactory(({
        request,
        index,
        mappings,
        onBeforeWrite
      }) => {
        const hasPrivileges = hasPrivilegesWithRequest(request);

        const adminCluster = server.plugins.elasticsearch.getCluster('admin');
        const { callWithInternalUser } = adminCluster;

        const repository = new savedObjects.SavedObjectsRepository({
          index,
          mappings,
          onBeforeWrite,
          callCluster: callWithInternalUser
        });

        return new SecureSavedObjectsClient({
          repository,
          errors: savedObjects.SavedObjectsClient.errors,
          hasPrivileges
        });
      });

      savedObjects.registerScopedSavedObjectsClientWrapperFactory(({ client }) => {
        return {
          errors: client.errors,

          async create(type, attributes = {}, options = {}) {
            return await client.create(type, attributes, options);
          },

          async bulkCreate(objects, options = {}) {
            return await client.bulkCreate(objects, options);
          },

          async delete(type, id) {
            return await client.delete(type, id);
          },

          async find(options = {}) {
            return await client.find(options);
          },

          async bulkGet(objects = []) {
            return await client.bulkGet(objects);
          },

          async get(type, id) {
            return await client.get(type, id);
          },

          async update(type, id, attributes, options = {}) {
            return await client.update(type, id, attributes, options);
          }
        };
      });
    }

    getUserProvider(server);

    await initAuthenticator(server);
    initAuthenticateApi(server);
    initUsersApi(server);
    initRolesApi(server);
    initIndicesApi(server);
    initPrivilegesApi(server);
    initLoginView(server, xpackMainPlugin);
    initLogoutView(server);

    server.injectUiAppVars('login', () => {
      const pluginId = 'security';
      const xpackInfo = server.plugins.xpack_main.info;
      const { showLogin, loginMessage, allowLogin } = xpackInfo.feature(pluginId).getLicenseCheckResults() || {};

      return {
        loginState: {
          showLogin,
          allowLogin,
          loginMessage
        }
      };
    });
  }
});
