/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction } from '@kbn/alerting-plugin/common';
import type { ResponseAction, RuleResponseAction } from './rule_response_actions/schemas';
import type { RuleAlertAction } from './types';

export const transformRuleToAlertAction = ({
  group,
  id,
  action_type_id: actionTypeId,
  params,
  uuid,
}: RuleAlertAction): RuleAction => ({
  group,
  id,
  params,
  actionTypeId,
  ...(uuid && { uuid }),
});

export const transformAlertToRuleAction = ({
  group,
  id,
  actionTypeId,
  params,
  uuid,
}: RuleAction): RuleAlertAction => ({
  group,
  id,
  params,
  action_type_id: actionTypeId,
  ...(uuid && { uuid }),
});

export const transformRuleToAlertResponseAction = ({
  action_type_id: actionTypeId,
  params,
}: ResponseAction): RuleResponseAction => {
  const {
    saved_query_id: savedQueryId,
    ecs_mapping: ecsMapping,
    pack_id: packId,
    ...rest
  } = params;

  return {
    params: {
      ...rest,
      savedQueryId,
      ecsMapping,
      packId,
    },
    actionTypeId,
  };
};

export const transformAlertToRuleResponseAction = ({
  actionTypeId,
  params,
}: RuleResponseAction): ResponseAction => {
  const { savedQueryId, ecsMapping, packId, ...rest } = params;
  return {
    params: {
      ...rest,
      saved_query_id: savedQueryId,
      ecs_mapping: ecsMapping,
      pack_id: packId,
    },
    action_type_id: actionTypeId,
  };
};
