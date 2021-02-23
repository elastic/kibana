/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

import { SIGNALS_ID, SERVER_APP_ID } from '../../../../common/constants';
import { SetupPlugins } from '../../../plugin';
import { SignalRuleAlertTypeDefinition } from './types';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { RuleTypeParams } from '../types';
import { ruleExecutor } from './rule_executor';

export const signalRulesAlertType = ({
  logger,
  eventsTelemetry,
  version,
  ml,
  lists,
}: {
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  version: string;
  ml: SetupPlugins['ml'];
  lists: SetupPlugins['lists'] | undefined;
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM signal',
    actionGroups: siemRuleActionGroups,
    defaultActionGroupId: 'default',
    validate: {
      /**
       * TODO: Fix typing inconsistancy between `RuleTypeParams` and `CreateRulesOptions`
       * Once that's done, you should be able to do:
       * ```
       * params: signalParamsSchema(),
       * ```
       */
      params: (signalParamsSchema() as unknown) as {
        validate: (object: unknown) => RuleTypeParams;
      },
    },
    producer: SERVER_APP_ID,
    minimumLicenseRequired: 'basic',
    executor({
      previousStartedAt,
      startedAt,
      alertId,
      services,
      params,
      spaceId,
      updatedBy,
      state,
      name,
      tags,
      createdBy,
    }) {
      return ruleExecutor({
        previousStartedAt,
        startedAt,
        alertId,
        services,
        params,
        spaceId,
        updatedBy,
        logger,
        state,
        name,
        tags,
        createdBy,
        version,
        ml,
        lists,
        eventsTelemetry,
      });
    },
  };
};
