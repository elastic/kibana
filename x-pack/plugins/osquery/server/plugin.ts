/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
} from '../../fleet/common';
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
import { PLUGIN_ID } from '../common';

const registerFeatures = (features: SetupPlugins['features']) => {
  features.registerKibanaFeature({
    id: PLUGIN_ID,
    name: i18n.translate('xpack.osquery.features.osqueryFeatureName', {
      defaultMessage: 'Osquery',
    }),
    category: DEFAULT_APP_CATEGORIES.management,
    app: [PLUGIN_ID, 'kibana'],
    catalogue: [PLUGIN_ID],
    order: 2300,
    excludeFromBasePrivileges: true,
    privileges: {
      all: {
        api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-write`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
          read: [PACKAGES_SAVED_OBJECT_TYPE, AGENT_POLICY_SAVED_OBJECT_TYPE],
        },
        ui: ['write'],
      },
      read: {
        api: [`${PLUGIN_ID}-read`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [
            PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            PACKAGES_SAVED_OBJECT_TYPE,
            AGENT_POLICY_SAVED_OBJECT_TYPE,
          ],
        },
        ui: ['read'],
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.osquery.features.liveQueriesSubFeatureName', {
          defaultMessage: 'Live queries',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writeLiveQueries`, `${PLUGIN_ID}-readLiveQueries`],
                id: 'live_queries_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['writeLiveQueries', 'readLiveQueries'],
              },
              {
                api: [`${PLUGIN_ID}-readLiveQueries`],
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
                api: [`${PLUGIN_ID}-runSavedQueries`],
                id: 'run_saved_queries',
                name: i18n.translate('xpack.osquery.features.runSavedQueriesPrivilegeName', {
                  defaultMessage: 'Run Saved queries',
                }),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['runSavedQueries'],
              },
            ],
          },
        ],
      },
      {
        name: i18n.translate('xpack.osquery.features.savedQueriesSubFeatureName', {
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
                  read: [],
                },
                ui: ['writeSavedQueries', 'readSavedQueries'],
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
        // TODO: Rename it to "Packs" as part of https://github.com/elastic/kibana/pull/107345
        name: i18n.translate('xpack.osquery.features.scheduledQueryGroupsSubFeatureName', {
          defaultMessage: 'Scheduled query groups',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writePacks`],
                id: 'packs_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [packSavedObjectType],
                  read: [],
                },
                ui: ['writePacks', 'readPacks'],
              },
              {
                api: [`${PLUGIN_ID}-readPacks`],
                id: 'packs_read',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: [packSavedObjectType],
                },
                ui: ['readPacks'],
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
      getStartServices: core.getStartServices,
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
