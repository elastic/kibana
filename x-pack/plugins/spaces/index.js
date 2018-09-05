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
import { createSpacesService } from './server/lib/create_spaces_service';
import { getActiveSpace } from './server/lib/get_active_space';
import { getSpacesUsageCollector } from './server/lib/get_spaces_usage_collector';
import { wrapError } from './server/lib/errors';
import mappings from './mappings.json';
import { spacesSavedObjectsClientWrapperFactory } from './server/lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { SpacesClient } from './server/lib/spaces_client';

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
      url: 'space_selector',
      hidden: true,
    }],
    hacks: [],
    mappings,
    savedObjectsSchema: {
      space: {
        isNamespaceAgnostic: true,
      },
    },
    home: ['plugins/spaces/register_feature'],
    injectDefaultVars: function () {
      return {
        spaces: [],
        activeSpace: null
      };
    },
    replaceInjectedVars: async function (vars, request, server) {
      try {
        vars.activeSpace = {
          valid: true,
          space: await getActiveSpace(request.getSavedObjectsClient(), request.getBasePath(), server.config().get('server.basePath'))
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

    watchStatusAndLicenseToInitialize(xpackMainPlugin, thisPlugin, async () => {
      await createDefaultSpace(server);
    });

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin
    xpackMainPlugin.info.feature(thisPlugin.id).registerLicenseCheckResultsGenerator(checkLicense);

    const config = server.config();
    validateConfig(config, message => server.log(['spaces', 'warning'], message));

    const spacesService = createSpacesService(server);
    server.expose('getSpaceId', (request) => spacesService.getSpaceId(request));

    server.expose('spacesClient', {
      getScopedClient: (request) => {
        const adminCluster = server.plugins.elasticsearch.getCluster('admin');
        const { callWithRequest, callWithInternalUser } = adminCluster;
        const callCluster = (...args) => callWithRequest(request, ...args);
        const { savedObjects } = server;
        const internalRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);
        const callWithRequestRepository = savedObjects.getSavedObjectsRepository(callCluster);
        const authorization = server.plugins.security ? server.plugins.security.authorization : null;
        return new SpacesClient(authorization, callWithRequestRepository, internalRepository, request);
      }
    });

    const { addScopedSavedObjectsClientWrapperFactory, types } = server.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(Number.MAX_VALUE,
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );

    initSpacesApi(server);

    initSpacesRequestInterceptors(server);

    // Register a function with server to manage the collection of usage stats
    server.usage.collectorSet.register(getSpacesUsageCollector(server));
  }
});
