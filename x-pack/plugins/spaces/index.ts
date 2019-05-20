/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { SavedObjectsService } from 'src/legacy/server/saved_objects';
import { Request, Server } from 'hapi';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import mappings from './mappings.json';
import { SpacesAuditLogger } from './server/lib/audit_logger';
import { checkLicense } from './server/lib/check_license';
import { createDefaultSpace } from './server/lib/create_default_space';
import { createSpacesService } from './server/lib/create_spaces_service';
import { wrapError } from './server/lib/errors';
import { getActiveSpace } from './server/lib/get_active_space';
import { getSpaceSelectorUrl } from './server/lib/get_space_selector_url';
import { getSpacesUsageCollector } from './server/lib/get_spaces_usage_collector';
import { migrateToKibana660 } from './server/lib/migrations';
import { initSpacesRequestInterceptors } from './server/lib/request_inteceptors';
import { spacesSavedObjectsClientWrapperFactory } from './server/lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { SpacesClient } from './server/lib/spaces_client';
import { createSpacesTutorialContextFactory } from './server/lib/spaces_tutorial_context_factory';
import { toggleUICapabilities } from './server/lib/toggle_ui_capabilities';
import { initPublicSpacesApi } from './server/routes/api/public';
import { initPrivateApis } from './server/routes/api/v1';

export const spaces = (kibana: Record<string, any>) =>
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

    uiCapabilities() {
      return {
        spaces: {
          manage: true,
        },
      };
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
      migrations: {
        space: {
          '6.6.0': migrateToKibana660,
        },
      },
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
      async replaceInjectedVars(
        vars: Record<string, any>,
        request: Record<string, any>,
        server: Record<string, any>
      ) {
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

    async init(server: Server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;

      watchStatusAndLicenseToInitialize(xpackMainPlugin, thisPlugin, async () => {
        await createDefaultSpace(server);
      });

      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin.
      xpackMainPlugin.info
        .feature(thisPlugin.id)
        .registerLicenseCheckResultsGenerator(checkLicense);

      const spacesService = createSpacesService(server);
      server.expose('getSpaceId', (request: any) => spacesService.getSpaceId(request));

      const config = server.config();

      const spacesAuditLogger = new SpacesAuditLogger(
        new AuditLogger(server, 'spaces', config, xpackMainPlugin.info)
      );

      server.expose('spacesClient', {
        getScopedClient: (request: Request) => {
          const adminCluster = server.plugins.elasticsearch.getCluster('admin');
          const { callWithRequest, callWithInternalUser } = adminCluster;
          const callCluster = callWithRequest.bind(adminCluster, request);
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
        Number.MAX_SAFE_INTEGER - 1,
        spacesSavedObjectsClientWrapperFactory(spacesService, types)
      );

      server.addScopedTutorialContextFactory(createSpacesTutorialContextFactory(spacesService));

      initPrivateApis(server);
      initPublicSpacesApi(server);

      initSpacesRequestInterceptors(server);

      // Register a function with server to manage the collection of usage stats
      server.usage.collectorSet.register(getSpacesUsageCollector(server));

      server.registerCapabilitiesModifier(async (request, uiCapabilities) => {
        const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
        try {
          const activeSpace = await getActiveSpace(
            spacesClient,
            request.getBasePath(),
            server.config().get('server.basePath')
          );

          const features = server.plugins.xpack_main.getFeatures();
          return toggleUICapabilities(features, uiCapabilities, activeSpace);
        } catch (e) {
          return uiCapabilities;
        }
      });
    },
  });
