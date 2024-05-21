/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { RuleCreateProps } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { convertCreateAPIToInternalSchema } from '../../normalization/rule_converters';
import type { RuleParams } from '../../../rule_schema';

export interface CreateRulesOptions<T extends RuleCreateProps = RuleCreateProps> {
  rulesClient: RulesClient;
  actionsClient: ActionsClient;
  params: T;
  id?: string;
  immutable?: boolean;
  defaultEnabled?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export const createRules = async ({
  actionsClient,
  rulesClient,
  params,
  id,
  immutable = false,
  defaultEnabled = true,
  allowMissingConnectorSecrets,
}: CreateRulesOptions): Promise<SanitizedRule<RuleParams>> => {
  const [oldActions, systemActions] = partition(params.actions, (action) =>
    actionsClient.isSystemAction(action.action_type_id)
  );
  console.log('SYSTEM ACTIONS', systemActions);
  console.log('OLD ACTIONS', oldActions);
  const internalRule = convertCreateAPIToInternalSchema(
    { ...params, actions: oldActions, systemActions },
    immutable,
    defaultEnabled
  );
  const rule = await rulesClient.create<RuleParams>({
    options: {
      id,
    },
    data: internalRule,
    allowMissingConnectorSecrets,
  });

  return rule;
};
