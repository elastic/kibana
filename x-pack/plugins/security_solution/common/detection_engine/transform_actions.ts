/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleAction as AlertingRuleAction,
  RuleSystemAction as AlertingRuleSystemAction,
} from '@kbn/alerting-plugin/common';
import type {
  NormalizedAlertAction,
  NormalizedSystemAction,
} from '@kbn/alerting-plugin/server/rules_client';
import type { NormalizedRuleAction } from '../api/detection_engine/rule_management';
import type {
  ResponseAction,
  RuleResponseAction,
} from '../api/detection_engine/model/rule_response_actions';
import { ResponseActionTypesEnum } from '../api/detection_engine/model/rule_response_actions';
import type { RuleAction } from '../api/detection_engine/model';

export const transformRuleToAlertAction = ({
  group,
  id,
  action_type_id: actionTypeId,
  params,
  uuid,
  frequency,
  alerts_filter: alertsFilter,
}: RuleAction): AlertingRuleAction | AlertingRuleSystemAction => ({
  id,
  params: params as AlertingRuleAction['params'],
  actionTypeId,
  ...(alertsFilter && {
    alertsFilter: alertsFilter as AlertingRuleAction['alertsFilter'],
  }),
  ...(uuid && { uuid }),
  ...(frequency && { frequency }),
  ...(group && { group }),
});

export const transformAlertToRuleAction = ({
  group,
  id,
  actionTypeId,
  params,
  uuid,
  frequency,
  alertsFilter,
}: AlertingRuleAction): RuleAction => ({
  id,
  params,
  action_type_id: actionTypeId,
  ...(alertsFilter && { alerts_filter: alertsFilter }),
  ...(uuid && { uuid }),
  ...(frequency && { frequency }),
  ...(group && { group }),
});

export const transformAlertToRuleSystemAction = ({
  id,
  actionTypeId,
  params,
  uuid,
}: AlertingRuleSystemAction): RuleAction => ({
  id,
  params,
  action_type_id: actionTypeId,
  ...(uuid && { uuid }),
});

export const transformNormalizedRuleToAlertAction = ({
  group,
  id,
  params,
  frequency,
  alerts_filter: alertsFilter,
}: NormalizedRuleAction): NormalizedAlertAction | NormalizedSystemAction => ({
  id,
  params: params as AlertingRuleAction['params'],
  ...(alertsFilter && {
    // We use "unknown" as the alerts filter type which is stricter than the one
    // used in the alerting plugin (what they use is essentially "any"). So we
    // have to to cast here
    alertsFilter: alertsFilter as AlertingRuleAction['alertsFilter'],
  }),
  ...(frequency && { frequency }),
  ...(group && { group }),
});

export const transformAlertToNormalizedRuleAction = ({
  group,
  id,
  params,
  frequency,
  alertsFilter,
}: AlertingRuleAction): NormalizedRuleAction => ({
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
  if (actionTypeId === ResponseActionTypesEnum['.osquery']) {
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
  if (actionTypeId === ResponseActionTypesEnum['.osquery']) {
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
