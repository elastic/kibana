/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { validateConfig } from './server/lib/validate_config';
import { checkLicense } from './server/lib/check_license';
import { initSpacesApi } from './server/routes/api/v1/spaces';
import { initSpacesRequestInterceptors } from './server/lib/space_request_interceptors';
import { createDefaultSpace } from './server/lib/create_default_space';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { getActiveSpace } from './server/lib/get_active_space';
import { wrapError } from './server/lib/errors';
import mappings from './mappings.json';
import { initSelectedSpaceState } from './server/lib/selected_space_state';

export const spaces = (kibana) => new kibana.Plugin({
  id: 'spaces',
  configPrefix: 'xpack.spaces',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],

  config(Joi) {
    return Joi.object({
      enabled: Joi.boolean().default(true),
      rememberSelectedSpace: Joi.boolean().default(true),
    }).default();
  },

  uiExports: {
    chromeNavControls: ['plugins/spaces/views/nav_control'],
    managementSections: ['plugins/spaces/views/management'],
    apps: [{
      id: 'space_selector',
      title: 'Spaces',
      main: 'plugins/spaces/views/space_selector',
      url: 'space_selector',
      hidden: true,
    }],
    hacks: [],
    mappings,
    home: ['plugins/spaces/register_feature'],
    injectDefaultVars: function () {
      return {
        spaces: [],
        activeSpace: null
      };
    },
    replaceInjectedVars: async function (vars, request) {
      // A rather obtuse way of preventing the Kibana login/logout resources from trying to make these requests.
      // This seems safer than excluding a couple of hard-coded paths.
      const canReplace = request.path.startsWith('/app/');
      if (!canReplace) {
        return vars;
      }

      try {
        vars.activeSpace = {
          valid: true,
          space: await getActiveSpace(request.getSavedObjectsClient(), request.getBasePath())
        };
      } catch (e) {
        vars.activeSpace = {
          valid: false,
          error: wrapError(e).output.payload
        };
      }
      return vars;
    }
  },

  async init(server) {
    const thisPlugin = this;
    const xpackMainPlugin = server.plugins.xpack_main;
    mirrorPluginStatus(xpackMainPlugin, thisPlugin);

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(thisPlugin.id).registerLicenseCheckResultsGenerator(checkLicense);

    const config = server.config();
    validateConfig(config, message => server.log(['spaces', 'warning'], message));

    initSpacesApi(server);

    initSelectedSpaceState(server, config);

    initSpacesRequestInterceptors(server);

    await createDefaultSpace(server);
  }
});
