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
import { isSystemAction } from '../utils/is_system_action';

export const transformRuleToAlertAction = (action: RuleAlertAction): RuleAction => {
  if (isSystemAction(action)) {
    const { action_type_id: actionTypeId, id, uuid, params, type } = action;

    return { actionTypeId, id, uuid, params, type };
  }

  const {
    group,
    id,
    action_type_id: actionTypeId,
    params,
    uuid,
    frequency,
    alerts_filter: alertsFilter,
    type,
  } = action;

  return {
    group,
    id,
    params,
    actionTypeId,
    ...(alertsFilter && { alertsFilter }),
    ...(uuid && { uuid }),
    ...(type && { type }),
    ...(frequency && { frequency }),
  };
};

export const transformAlertToRuleAction = (action: RuleAction): RuleAlertAction => {
  if (isSystemAction(action)) {
    const { actionTypeId, id, uuid, params, type } = action;

    return { action_type_id: actionTypeId, id, uuid, params, type };
  }

  const { group, id, actionTypeId, params, uuid, frequency, alertsFilter, type } = action;

  return {
    group,
    id,
    params,
    action_type_id: actionTypeId,
    ...(alertsFilter && { alerts_filter: alertsFilter }),
    ...(uuid && { uuid }),
    ...(type && { type }),
    ...(frequency && { frequency }),
  };
};

export const transformNormalizedRuleToAlertAction = (
  action: NormalizedRuleAction
): NormalizedAlertAction => {
  if (isSystemAction(action)) {
    const { id, uuid, params, type } = action;

    return { id, uuid, params, type };
  }

  const { group, id, params, frequency, alerts_filter: alertsFilter, type, uuid } = action;

  return {
    group,
    id,
    params,
    ...(alertsFilter && { alertsFilter }),
    ...(frequency && { frequency }),
    ...(type && { type }),
    ...(uuid && { uuid }),
  };
};

export const transformAlertToNormalizedRuleAction = (action: RuleAction): NormalizedRuleAction => {
  if (isSystemAction(action)) {
    const { id, uuid, params, type } = action;

    return { id, uuid, params, type };
  }

  const { group, id, params, frequency, alertsFilter, type, uuid } = action;

  return {
    group,
    id,
    params,
    ...(alertsFilter && { alerts_filter: alertsFilter }),
    ...(frequency && { frequency }),
    ...(type && { type }),
    ...(uuid && { uuid }),
  };
};

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
