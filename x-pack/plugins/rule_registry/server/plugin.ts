/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup, Logger } from 'src/core/server';
import { SpacesPluginStart } from '../../spaces/server';

import { RuleRegistryPluginConfig } from './config';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { EventLogService, IEventLogService } from './event_log';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RuleRegistryPluginSetupDependencies {}

interface RuleRegistryPluginStartDependencies {
  spaces: SpacesPluginStart;
}

export interface RuleRegistryPluginSetupContract {
  ruleDataService: RuleDataPluginService;
  eventLogService: IEventLogService;
}

export type RuleRegistryPluginStartContract = void;

export class RuleRegistryPlugin
  implements
    Plugin<
      RuleRegistryPluginSetupContract,
      RuleRegistryPluginStartContract,
      RuleRegistryPluginSetupDependencies,
      RuleRegistryPluginStartDependencies
    > {
  private readonly config: RuleRegistryPluginConfig;
  private readonly logger: Logger;
  private eventLogService: EventLogService | null;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    this.logger = initContext.logger.get();
    this.eventLogService = null;
  }

  public setup(
    core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>
  ): RuleRegistryPluginSetupContract {
    const { config, logger } = this;

    const startDependencies = core.getStartServices().then(([coreStart, pluginStart]) => {
      return {
        core: coreStart,
        ...pluginStart,
      };
    });

    const ruleDataService = new RuleDataPluginService({
      logger,
      isWriteEnabled: config.write.enabled,
      index: config.index,
      getClusterClient: async () => {
        const deps = await startDependencies;
        return deps.core.elasticsearch.client.asInternalUser;
      },
    });

    ruleDataService.init().catch((originalError) => {
      const error = new Error('Failed installing assets');
      // @ts-ignore
      error.stack = originalError.stack;
      logger.error(error);
    });

    const eventLogService = new EventLogService({
      config: {
        indexPrefix: this.config.index,
        isWriteEnabled: this.config.write.enabled,
      },
      dependencies: {
        clusterClient: startDependencies.then((deps) => deps.core.elasticsearch.client),
        spacesService: startDependencies.then((deps) => deps.spaces.spacesService),
        logger: logger.get('eventLog'),
      },
    });

    this.eventLogService = eventLogService;
    return { ruleDataService, eventLogService };
  }

  public start(): RuleRegistryPluginStartContract {}

  public stop() {
    const { eventLogService, logger } = this;

    if (eventLogService) {
      eventLogService.stop().catch((e) => {
        logger.error(e);
      });
    }
  }
}
