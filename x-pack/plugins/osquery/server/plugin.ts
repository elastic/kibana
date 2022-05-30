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
  SavedObjectsClient,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { curry, mapKeys, some, uniq } from 'lodash';
import { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { createActionHandler } from './handlers';
import { createConfig } from './create_config';
import { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import { initUsageCollectors } from './usage';
import { OsqueryAppContext, OsqueryAppContextService } from './lib/osquery_app_context_services';
import { ConfigType } from './config';
import {
  packSavedObjectType,
  packAssetSavedObjectType,
  savedQuerySavedObjectType,
} from '../common/types';
import { PLUGIN_ID } from '../common';
import { getPackagePolicyDeleteCallback } from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';

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
    privileges: {
      all: {
        api: [`${PLUGIN_ID}-read`, `${PLUGIN_ID}-write`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: ['write'],
      },
      read: {
        api: [`${PLUGIN_ID}-read`],
        app: [PLUGIN_ID, 'kibana'],
        catalogue: [PLUGIN_ID],
        savedObject: {
          all: [],
          read: [],
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
                api: [`${PLUGIN_ID}-writeSavedQueries`, `${PLUGIN_ID}-readSavedQueries`],
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
                api: [`${PLUGIN_ID}-readSavedQueries`],
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
        name: i18n.translate('xpack.osquery.features.packsSubFeatureName', {
          defaultMessage: 'Packs',
        }),
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: [`${PLUGIN_ID}-writePacks`, `${PLUGIN_ID}-readPacks`],
                id: 'packs_all',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: [packSavedObjectType, packAssetSavedObjectType],
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
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  private telemetryUsageCounter?: UsageCounter;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.context = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);
  }

  public setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = createConfig(this.initializerContext);

    registerFeatures(plugins.features);

    const router = core.http.createRouter();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      getStartServices: core.getStartServices,
      service: this.osqueryAppContextService,
      config: (): ConfigType => config,
      security: plugins.security,
      telemetryEventsSender: this.telemetryEventsSender,
    };

    initSavedObjects(core.savedObjects);
    initUsageCollectors({
      core,
      osqueryContext,
      usageCollection: plugins.usageCollection,
    });

    this.telemetryUsageCounter = plugins.usageCollection?.createUsageCounter(PLUGIN_ID);

    defineRoutes(router, osqueryContext);

    plugins.actions.registerType({
      id: '.osquery',
      name: 'Osquery',
      minimumLicenseRequired: 'gold',
      executor: curry(executor)({
        osqueryContext,
      }),
    });
    core.getStartServices().then(([, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(depsStart.data);

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
    });

    this.telemetryEventsSender.setup(
      this.telemetryReceiver,
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryUsageCounter
    );

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

    this.telemetryReceiver.start(core, this.osqueryAppContextService);

    this.telemetryEventsSender.start(
      plugins.telemetry,
      plugins.taskManager,
      this.telemetryReceiver
    );

    if (registerIngestCallback) {
      const client = new SavedObjectsClient(core.savedObjects.createInternalRepository());

      registerIngestCallback('postPackagePolicyDelete', getPackagePolicyDeleteCallback(client));
    }

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.telemetryEventsSender.stop();
    this.osqueryAppContextService.stop();
  }
}

// @ts-expect-error update types
async function executor(payload, execOptions): Promise<ActionTypeExecutorResult<unknown>> {
  console.log('actionID', execOptions.actionId);
  console.log('params', execOptions.params);
  // console.log('execOptions.params.message.alerts', JSON.parse(execOptions.params.message.alerts));
  const parsedAlerts = JSON.parse(execOptions.params.message.alerts);
  // @ts-expect-error update types
  const affectedHosts = uniq(parsedAlerts.map((alert) => alert.host?.name));
  // @ts-expect-error update types
  const agentIds = uniq(parsedAlerts.map((alert) => alert.agent?.id));

  // console.log('affectedHosts', affectedHosts);
  // console.log('agentIds', agentIds);

  const agentsService = payload.osqueryContext.service.getAgentService();
  const policyService = payload.osqueryContext.service.getAgentPolicyService();
  // const caseClient = payload.osqueryContext.service.getCaseClient(
  //   execOptions.services.scopedClusterClient,
  //   execOptions.services.savedObjectsClient,
  //   {
  //     email: '',
  //     full_name: '',
  //     username: '',
  //   }
  // );
  // console.log(agentsService);

  // d6ca36c0-ee54-435f-8d18-6bd4d7fe2300
  // TODO remove array
  const agents = [await agentsService.asInternalUser.getAgent(agentIds[0])];
  // console.log('agents', JSON.stringify(agents, null, 2));
  const agentsById = mapKeys(agents, 'id');

  // console.log('agentsById', JSON.stringify(agentsById, null, 2));

  const policyIds: string[] = uniq(agents.map((agent) => agent.policy_id));

  // console.log('policyIds', policyIds);

  const policies = await Promise.all(
    policyIds.map(
      async (policyId) => await policyService.get(execOptions.services.savedObjectsClient, policyId)
    )
  );
  // console.log('policies', policies);

  const policiesById = mapKeys(policies, 'id');

  // console.log('policiesById', policiesById);

  const agentsWithOsqueryPolicy = agents.filter((agent) => {
    if (!agent.policy_id) {
      return false;
    }

    const agentPolicy = policiesById[agent.policy_id];

    if (!agentPolicy) {
      return false;
    }

    return some(
      agentPolicy.package_policies,
      (packagePolicy) => packagePolicy.package.name === 'osquery_manager'
    );
  });

  // console.log('agentsWithOsqueryPolicy', agentsWithOsqueryPolicy.length);

  // console.log('caseClient', caseClient, Object.keys(caseClient));
  //
  // console.log('policies', JSON.stringify(policies, null, 2));

  const response = await createActionHandler(
    execOptions.services.scopedClusterClient,
    execOptions.services.savedObjectsClient,
    {
      agents: [agentIds[0]],
      query: {
        query: 'select * from uptime',
      },
    }
  );

  // const caseId = '53428a60-7aae-11eb-a532-0f6743084623';
  //
  // if (caseClient && caseId) {
  //   caseClient.addComment({
  //     caseId,
  //     comment: {
  //       type: 'osquery_alert',
  //       alertId: response.actions[0].action_id,
  //       index: '.fleet-actions',
  //       rule: {
  //         id: '',
  //         name: '',
  //       },
  //     },
  //   });
  // }

  // console.log('response', JSON.stringify(response, null, 2));

  return { status: 'ok', data: {}, actionId: execOptions.actionId };
}
