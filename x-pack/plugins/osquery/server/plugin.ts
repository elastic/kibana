/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/server';
import { createConfig } from './create_config';
import { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import { initUsageCollectors } from './usage';
import { OsqueryAppContext, OsqueryAppContextService } from './lib/osquery_app_context_services';
import { ConfigType } from './config';
import { packSavedObjectType, savedQuerySavedObjectType } from '../common/types';

const registerFeatures = (features: SetupPlugins['features']) => {
  features.registerKibanaFeature({
    id: 'osquery',
    name: i18n.translate('xpack.features.osqueryFeatureName', {
      defaultMessage: 'Osquery',
    }),
    order: 1300,
    category: DEFAULT_APP_CATEGORIES.management,
    app: ['osquery', 'kibana'],
    catalogue: ['osquery'],
    privileges: {
      all: {
        app: ['osquery', 'kibana'],
        catalogue: ['osquery'],
        savedObject: {
          all: ['search', 'query'],
          read: ['index-pattern'],
        },
        ui: ['show', 'save'],
      },
      read: {
        app: ['osquery', 'kibana'],
        catalogue: ['osquery'],
        savedObject: {
          all: [],
          read: ['index-pattern', 'search', 'query'],
        },
        ui: ['show'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.features.ossFeatures.discoverShortUrlSubFeatureName', {
          defaultMessage: 'Live queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'live_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['crudLiveQueries', 'readLiveQueries'],
              },
              {
                id: 'live_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['readLiveQueries'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'saved_queries_only',
                name: i18n.translate(
                  'xpack.features.ossFeatures.discoverCreateShortUrlPrivilegeName',
                  {
                    defaultMessage: 'Run Saved queries only',
                  }
                ),
                includeIn: 'none',
                savedObject: {
                  all: [],
                  read: [savedQuerySavedObjectType],
                },
                ui: ['savedQueriesOnly'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.features.ossFeatures.discoverShortUrlSubFeatureName', {
          defaultMessage: 'Saved queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'saved_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [savedQuerySavedObjectType],
                  read: [savedQuerySavedObjectType],
                },
                ui: ['crudSavedQueries', 'readSavedQueries'],
              },
              {
                id: 'saved_queries_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [savedQuerySavedObjectType],
                },
                ui: ['readSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.features.ossFeatures.discoverShortUrlSubFeatureName', {
          defaultMessage: 'Scheduled query groups',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'packs_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [packSavedObjectType],
                  read: [packSavedObjectType],
                },
                ui: ['crudPacks', 'readPacks'],
              },
              {
                id: 'packs_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [packSavedObjectType],
                },
                ui: ['savedLiveQueries'],
              },
            ],
          },
        ],
      },
    ],
  });
};

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.context = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = createConfig(this.initializerContext);

    if (!config.enabled) {
      return {};
    }

    registerFeatures(plugins.features);

    const router = core.http.createRouter();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      service: this.osqueryAppContextService,
      config: (): ConfigType => config,
      security: plugins.security,
    };

    initSavedObjects(core.savedObjects, osqueryContext);
    initUsageCollectors({
      core,
      osqueryContext,
      usageCollection: plugins.usageCollection,
    });
    defineRoutes(router, osqueryContext);

    core.getStartServices().then(([, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(depsStart.data);

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.logger.debug('osquery: Started');
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;

    this.osqueryAppContextService.start({
      ...plugins.fleet,
      // @ts-expect-error update types
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
    });

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.osqueryAppContextService.stop();
  }
}
