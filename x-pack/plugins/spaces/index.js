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
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import mappings from './mappings.json';

export const spaces = (kibana) => new kibana.Plugin({
  id: 'spaces',
  configPrefix: 'xpack.spaces',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],

  config(Joi) {
    return Joi.object({
      enabled: Joi.boolean().default(true),
    }).default();
  },

  uiExports: {
    chromeNavControls: ['plugins/spaces/views/nav_control'],
    managementSections: ['plugins/spaces/views/management'],
    apps: [{
      id: 'space_selector',
      title: 'Spaces',
      main: 'plugins/spaces/views/space_selector',
      hidden: true,
    }],
    hacks: [],
    mappings,
    home: ['plugins/spaces/register_feature'],
    injectDefaultVars: function () {
      return {
        spaces: []
      };
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

    initSpacesRequestInterceptors(server);
  }
});
