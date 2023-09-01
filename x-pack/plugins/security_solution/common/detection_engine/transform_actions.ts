/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction } from '@kbn/alerting-plugin/common';
import type { NormalizedAlertAction } from '@kbn/alerting-plugin/server/rules_client';
import type { NormalizedRuleAction } from '../api/detection_engine/rule_management/bulk_actions/bulk_actions_route';
import type {
  ResponseAction,
  RuleResponseAction,
} from '../api/detection_engine/model/rule_response_actions';
import { RESPONSE_ACTION_TYPES } from '../api/detection_engine/model/rule_response_actions';
import type { RuleAlertAction } from './types';

export const transformRuleToAlertAction = ({
  group,
  id,
  action_type_id: actionTypeId,
  params,
  uuid,
  frequency,
  alerts_filter: alertsFilter,
}: RuleAlertAction): RuleAction => ({
  group,
  id,
  params,
  actionTypeId,
  ...(alertsFilter && { alertsFilter }),
  ...(uuid && { uuid }),
  ...(frequency && { frequency }),
});

export const transformAlertToRuleAction = ({
  group,
  id,
  actionTypeId,
  params,
  uuid,
  frequency,
  alertsFilter,
}: RuleAction): RuleAlertAction => ({
  group,
  id,
  params,
  action_type_id: actionTypeId,
  ...(alertsFilter && { alerts_filter: alertsFilter }),
  ...(uuid && { uuid }),
  ...(frequency && { frequency }),
});

export const transformNormalizedRuleToAlertAction = ({
  group,
  id,
  params,
  frequency,
  alerts_filter: alertsFilter,
}: NormalizedRuleAction): NormalizedAlertAction => ({
  group,
  id,
  params,
  ...(alertsFilter && { alertsFilter }),
  ...(frequency && { frequency }),
});

export const transformAlertToNormalizedRuleAction = ({
  group,
  id,
  params,
  frequency,
  alertsFilter,
}: RuleAction): NormalizedRuleAction => ({
  group,
  id,
  params,
  ...(alertsFilter && { alerts_filter: alertsFilter }),
  ...(frequency && { frequency }),
});

export const transformRuleToAlertResponseAction = ({
  action_type_id: actionTypeId,
  params,
}: ResponseAction): RuleResponseAction => {
  if (actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY) {
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
  }
  return {
    params,
    actionTypeId,
  };
};

export const transformAlertToRuleResponseAction = ({
  actionTypeId,
  params,
}: RuleResponseAction): ResponseAction => {
  if (actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY) {
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
  }
  return {
    params,
    action_type_id: actionTypeId,
  };
};
