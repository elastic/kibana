/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { SavedObjectsService } from 'src/legacy/server/saved_objects';
import { PluginInitializerContext, HttpServiceSetup } from 'src/core/server';
// @ts-ignore
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import mappings from './mappings.json';
import { wrapError } from './server/lib/errors';
import { getActiveSpace } from './server/lib/get_active_space';
import { getSpaceSelectorUrl } from './server/lib/get_space_selector_url';
import { migrateToKibana660 } from './server/lib/migrations';
import { toggleUICapabilities } from './server/lib/toggle_ui_capabilities';
import { plugin } from './server/new_platform';
import { XPackMainPlugin } from '../xpack_main/xpack_main';
import { SecurityPlugin } from '../security';
import { SpacesPlugin } from './types';

export interface SpacesCoreSetup {
  http: HttpServiceSetup;
  xpackMain: XPackMainPlugin;
  getSecurity: () => SecurityPlugin;
  savedObjects: SavedObjectsService;
  spaces: SpacesPlugin;
  elasticsearch: ElasticsearchPlugin;
  usage: {
    collectorSet: {
      register: (collector: any) => void;
    };
  };
  tutorial: {
    addScopedTutorialContextFactory: (factory: any) => void;
  };
}

export interface SpacesConfig {
  get: (key: string) => string;
}

export interface SpacesInitializerContext extends PluginInitializerContext {
  legacyConfig: SpacesConfig;
}

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
          uiCapabilities: {
            spaces: {
              manage: true,
            },
          },
        };
      },
      async replaceInjectedVars(
        vars: Record<string, any>,
        request: Record<string, any>,
        server: Record<string, any>
      ) {
        const spacesClient = server.plugins.spaces.spacesClient.scopedClient(request);
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

        if (vars.activeSpace.space) {
          const features = server.plugins.xpack_main.getFeatures();
          vars.uiCapabilities = toggleUICapabilities(
            features,
            vars.uiCapabilities,
            vars.activeSpace.space
          );
        }

        return vars;
      },
    },

    async init(server: Server) {
      const kbnServer = (server as unknown) as KbnServer;
      const initializerContext = ({
        legacyConfig: server.config(),
        logger: {
          get: (context: string) => ({
            debug: (message: any) => server.log([context, 'debug'], message),
            info: (message: any) => server.log([context, 'info'], message),
            warning: (message: any) => server.log([context, 'warning'], message),
            error: (message: any) => server.log([context, 'error'], message),
          }),
        },
      } as unknown) as SpacesInitializerContext;

      const core = {
        http: kbnServer.newPlatform.setup.core.http,
        elasticsearch: server.plugins.elasticsearch,
        xpackMain: server.plugins.xpack_main,
        spaces: this,
        getSecurity: () => server.plugins.security,
        savedObjects: server.savedObjects,
        usage: (server as any).usage,
        tutorial: {
          addScopedTutorialContextFactory: (server as any).addScopedTutorialContextFactory,
        },
      } as SpacesCoreSetup;

      // Need legacy because of `setup_base_path_provider`
      // (request.getBasePath and request.setBasePath)
      core.http.server = kbnServer as any;

      const { spacesService } = await plugin(initializerContext).setup(core);

      server.expose('getSpaceId', (request: any) => spacesService.getSpaceId(request));
      server.expose('spacesClient', spacesService);
    },
  });
