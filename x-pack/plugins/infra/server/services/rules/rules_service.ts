/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'src/core/server';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { createRuleDataClient } from './rule_data_client';
import {
  RuleConsumerNames,
  RulesServiceSetup,
  RulesServiceSetupDeps,
  RulesServiceStart,
  RulesServiceStartDeps,
} from './types';

export class RulesService {
  constructor(public readonly consumerName: RuleConsumerNames, private readonly logger: Logger) {}

  public setup(
    core: CoreSetup<RulesServiceStartDeps>,
    setupDeps: RulesServiceSetupDeps
  ): RulesServiceSetup {
    const ruleDataClient = createRuleDataClient({
      consumerName: this.consumerName,
      getStartServices: core.getStartServices,
      logger: this.logger,
      ruleDataService: setupDeps.ruleRegistry.ruleDataService,
    });

    const createLifecycleRuleType = createLifecycleRuleTypeFactory({
      ruleDataClient,
      logger: this.logger,
    });

    return {
      createLifecycleRuleType,
      ruleDataClient,
    };
  }

  public start(_startDeps: RulesServiceStartDeps): RulesServiceStart {
    return {};
  }
}
