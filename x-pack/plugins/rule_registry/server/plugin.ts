/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup, CoreStart, Logger } from 'src/core/server';
import { SpacesPluginStart } from '../../spaces/server';

import { RuleRegistryPluginConfig } from './config';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { EventLogService, IEventLogService } from './event_log';
import { testEventLogImplementation } from './event_log/test_implementation';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RuleRegistryPluginSetupDependencies {}

interface RuleRegistryPluginStartDependencies {
  spaces: SpacesPluginStart;
}

export interface RuleRegistryPluginSetupContract {
  ruleDataService: RuleDataPluginService;
}

export interface RuleRegistryPluginStartContract {
  eventLogService: IEventLogService;
}

export class RuleRegistryPlugin
  implements
    Plugin<
      RuleRegistryPluginSetupContract,
      RuleRegistryPluginStartContract,
      RuleRegistryPluginSetupDependencies,
      RuleRegistryPluginStartDependencies
    > {
  private readonly initContext: PluginInitializerContext;
  private readonly config: RuleRegistryPluginConfig;
  private readonly logger: Logger;
  private eventLogService: EventLogService | null;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    this.logger = initContext.logger.get();
    this.eventLogService = null;
  }

  public setup(
    core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>
  ): RuleRegistryPluginSetupContract {
    const config = this.initContext.config.get<RuleRegistryPluginConfig>();

    const logger = this.initContext.logger.get();

    const ruleDataService = new RuleDataPluginService({
      logger,
      isWriteEnabled: config.write.enabled,
      index: config.index,
      getClusterClient: async () => {
        const [coreStart] = await core.getStartServices();

        return coreStart.elasticsearch.client.asInternalUser;
      },
    });

    ruleDataService.init().catch((originalError) => {
      const error = new Error('Failed installing assets');
      // @ts-ignore
      error.stack = originalError.stack;
      logger.error(error);
    });

    return { ruleDataService };
  }

  public start(
    core: CoreStart,
    plugins: RuleRegistryPluginStartDependencies
  ): RuleRegistryPluginStartContract {
    this.eventLogService = new EventLogService({
      config: {
        indexPrefix: this.config.index,
        isWriteEnabled: this.config.write.enabled,
      },
      dependencies: {
        clusterClient: Promise.resolve(core.elasticsearch.client), // TODO: get rid of Promise
        spaces: plugins.spaces.spacesService,
        logger: this.logger.get('eventLog'),
      },
    });

    testEventLogImplementation(this.eventLogService, this.logger);

    return {
      eventLogService: this.eventLogService,
    };
  }

  public stop() {
    if (this.eventLogService) {
      this.eventLogService.stop().catch((e) => {
        this.logger.error(e);
      });
    }
  }
}
