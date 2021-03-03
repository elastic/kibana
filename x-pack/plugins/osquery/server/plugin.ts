/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry, uniq, mapKeys, some } from 'lodash';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeExecutorResult } from '../../actions/server/types';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { createConfig } from './create_config';
import { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
// import { initSavedObjects } from './saved_objects';
import { OsqueryAppContext, OsqueryAppContextService } from './lib/osquery_app_context_services';
import { ConfigType } from './config';
import { createActionHandler } from './handlers';

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

    const router = core.http.createRouter();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      service: this.osqueryAppContextService,
      config: (): Promise<ConfigType> => Promise.resolve(config),
    };

    // initSavedObjects(core.savedObjects);
    defineRoutes(router, osqueryContext);

    if (config.actionEnabled) {
      plugins.actions.registerType({
        id: '.osquery',
        name: 'Osquery',
        minimumLicenseRequired: 'gold',
        executor: curry(executor)({
          osqueryContext,
        }),
      });
    }

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
      getCasesClient: plugins.cases?.getCasesClient,
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

// @ts-expect-error update types
async function executor(payload, execOptions): Promise<ActionTypeExecutorResult<unknown>> {
  // console.log('executor,', payload, execOptions);
  console.log(
    'asdsd',
    Object.keys(payload.osqueryContext),
    Object.keys(execOptions),
    Object.keys(execOptions.services),
    Object.keys(execOptions.params)
  );
  // console.log(
  //   'execOptions.params.message.alerts',
  //   JSON.parse(execOptions.params.message.alerts).length
  // );
  const parsedAlerts = JSON.parse(execOptions.params.message.alerts);
  // @ts-expect-error update types
  const affectedHosts = uniq(parsedAlerts.map((alert) => alert.host?.name));
  // @ts-expect-error update types
  const agentIds = uniq(parsedAlerts.map((alert) => alert.agent?.id));

  console.log('affectedHosts', affectedHosts);
  console.log('agentIds', agentIds);

  const agentsService = payload.osqueryContext.service.getAgentService();
  const policyService = payload.osqueryContext.service.getAgentPolicyService();
  const caseClient = payload.osqueryContext.service.getCasesClient(
    execOptions.services.scopedClusterClient,
    execOptions.services.savedObjectsClient,
    {
      email: '',
      full_name: '',
      username: '',
    }
  );
  console.log(agentsService);

  const agents = await agentsService.getAgents(
    execOptions.services.savedObjectsClient,
    execOptions.services.scopedClusterClient,
    ['b64923ff-e12c-40bf-a42e-159c8f12a5e8']
  );
  console.log('agents', JSON.stringify(agents, null, 2));
  const agentsById = mapKeys(agents, 'id');

  // console.log('agentsById', JSON.stringify(agentsById, null, 2));

  // @ts-expect-error update types
  const policyIds: string[] = uniq(agents.map((agent) => agent.policy_id));

  // console.log('policyIds', policyIds);

  const policies = await Promise.all(
    policyIds.map(
      async (policyId) => await policyService.get(execOptions.services.savedObjectsClient, policyId)
    )
  );
  const policiesById = mapKeys(policies, 'id');

  // console.log(
  //   'policiesById',
  //   Object.keys(policiesById),
  //   Object.keys(policiesById['fde75890-7551-11eb-b738-97756114a699'])
  // );

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
      (packagePolicy) => packagePolicy.package.name === 'osquery_elastic_managed'
    );
  });

  console.log('agentsWithOsqueryPolicy', agentsWithOsqueryPolicy.length);

  // console.log('caseClient', caseClient, Object.keys(caseClient));

  // console.log('policies', JSON.stringify(policies, null, 2));

  const response = await createActionHandler(
    execOptions.services.scopedClusterClient,
    execOptions.services.savedObjectsClient,
    {
      agents: ['b64923ff-e12c-40bf-a42e-159c8f12a5e8'],
      query: {
        query: 'select * from uptime',
      },
    }
  );

  const caseId = '53428a60-7aae-11eb-a532-0f6743084623';

  if (caseClient && caseId) {
    caseClient.addComment({
      caseId,
      comment: {
        type: 'osquery_alert',
        alertId: response.actions[0].action_id,
        index: '.fleet-actions',
        rule: {
          id: '',
          name: '',
        },
      },
    });
  }

  // console.log('response', JSON.stringify(response, null, 2));

  return { status: 'ok', data: {}, actionId: execOptions.actionId };
}
