/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { SavedObjectsService } from 'src/server/saved_objects';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { registerUserProfileCapabilityFactory } from '../xpack_main/server/lib/user_profile_registry';
import mappings from './mappings.json';
import { SpacesAuditLogger } from './server/lib/audit_logger';
import { checkLicense } from './server/lib/check_license';
import { createDefaultSpace } from './server/lib/create_default_space';
import { createSpacesService } from './server/lib/create_spaces_service';
import { wrapError } from './server/lib/errors';
import { getActiveSpace } from './server/lib/get_active_space';
import { getSpaceSelectorUrl } from './server/lib/get_space_selector_url';
import { getSpacesUsageCollector } from './server/lib/get_spaces_usage_collector';
import { spacesSavedObjectsClientWrapperFactory } from './server/lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { initSpacesRequestInterceptors } from './server/lib/space_request_interceptors';
import { SpacesClient } from './server/lib/spaces_client';
import { createSpacesTutorialContextFactory } from './server/lib/spaces_tutorial_context_factory';
import { initPublicSpacesApi } from './server/routes/api/public';
import { initPrivateApis } from './server/routes/api/v1';

export const spaces = (kibana: any) =>
  new kibana.Plugin({
    id: 'spaces',
    configPrefix: 'xpack.spaces',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        maxSpaces: Joi.number().default(1000),
      }).default();
    },

    uiExports: {
      chromeNavControls: ['plugins/spaces/views/nav_control'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/spaces/views/management'],
      apps: [
        {
          id: 'space_selector',
          title: 'Spaces',
          main: 'plugins/spaces/views/space_selector',
          url: 'space_selector',
          hidden: true,
        },
      ],
      hacks: [],
      mappings,
      savedObjectSchemas: {
        space: {
          isNamespaceAgnostic: true,
        },
      },
      home: ['plugins/spaces/register_feature'],
      injectDefaultVars(server: any) {
        return {
          spaces: [],
          activeSpace: null,
          spaceSelectorURL: getSpaceSelectorUrl(server.config()),
        };
      },
      async replaceInjectedVars(vars: any, request: any, server: any) {
        const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
        try {
          vars.activeSpace = {
            valid: true,
            space: await getActiveSpace(
              spacesClient,
              request.getBasePath(),
              server.config().get('server.basePath')
            ),
          };
        } catch (e) {
          vars.activeSpace = {
            valid: false,
            error: wrapError(e).output.payload,
          };
        }
        return vars;
      },
    },

    async init(server: any) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;

      watchStatusAndLicenseToInitialize(xpackMainPlugin, thisPlugin, async () => {
        await createDefaultSpace(server);
      });

      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info
        .feature(thisPlugin.id)
        .registerLicenseCheckResultsGenerator(checkLicense);

      const spacesService = createSpacesService(server);
      server.expose('getSpaceId', (request: any) => spacesService.getSpaceId(request));

      const config = server.config();

      const spacesAuditLogger = new SpacesAuditLogger(config, new AuditLogger(server, 'spaces'));

      server.expose('spacesClient', {
        getScopedClient: (request: any) => {
          const adminCluster = server.plugins.elasticsearch.getCluster('admin');
          const { callWithRequest, callWithInternalUser } = adminCluster;
          const callCluster = (...args: any[]) => callWithRequest(request, ...args);
          const { savedObjects } = server;
          const internalRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);
          const callWithRequestRepository = savedObjects.getSavedObjectsRepository(callCluster);
          const authorization = server.plugins.security
            ? server.plugins.security.authorization
            : null;
          return new SpacesClient(
            spacesAuditLogger,
            (message: string) => {
              server.log(['spaces', 'debug'], message);
            },
            authorization,
            callWithRequestRepository,
            server.config(),
            internalRepository,
            request
          );
        },
      });

      const {
        addScopedSavedObjectsClientWrapperFactory,
        types,
      } = server.savedObjects as SavedObjectsService;
      addScopedSavedObjectsClientWrapperFactory(
        Number.MAX_VALUE,
        spacesSavedObjectsClientWrapperFactory(spacesService, types)
      );

      server.addScopedTutorialContextFactory(createSpacesTutorialContextFactory(spacesService));

      initPrivateApis(server);
      initPublicSpacesApi(server);

      initSpacesRequestInterceptors(server);

      registerUserProfileCapabilityFactory(async request => {
        const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);

        let manageSecurity = false;

        if (server.plugins.security) {
          const { showLinks = false } =
            xpackMainPlugin.info.feature('security').getLicenseCheckResults() || {};
          manageSecurity = showLinks;
        }

        return {
          manageSpaces: await spacesClient.canEnumerateSpaces(),
          manageSecurity,
        };
      });

      // Register a function with server to manage the collection of usage stats
      server.usage.collectorSet.register(getSpacesUsageCollector(server));
    },
  });
