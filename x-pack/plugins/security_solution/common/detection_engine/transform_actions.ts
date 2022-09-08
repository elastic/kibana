/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, reduce, isEmpty } from 'lodash';
import type { RuleAction, RuleResponseAction } from '@kbn/alerting-plugin/common';
import type { EcsMappingFormValueArray } from '@kbn/osquery-plugin/common/schemas/common/utils';
import type { RuleAlertAction, RuleAlertResponseAction } from './types';
import { ResponseActionsTypes } from './types';

export const transformRuleToAlertAction = ({
  group,
  id,
  action_type_id, // eslint-disable-line @typescript-eslint/naming-convention
  params,
}: RuleAlertAction): RuleAction => ({
  group,
  id,
  params,
  actionTypeId: action_type_id,
});

export const transformAlertToRuleAction = ({
  group,
  id,
  actionTypeId,
  params,
}: RuleAction): RuleAlertAction => ({
  group,
  id,
  params,
  action_type_id: actionTypeId,
});

export const convertECSMappingToFormValue = (
  mapping?: Record<string, Record<'field', string>>
): EcsMappingFormValueArray =>
  map(mapping, (value, key) => ({
    key,
    result: {
      type: Object.keys(value)[0],
      value: Object.values(value)[0],
    },
  }));

export const transformRuleToAlertResponseAction = ({
  action_type_id, // eslint-disable-line @typescript-eslint/naming-convention
  params,
}: RuleAlertResponseAction): RuleResponseAction => {
  if (action_type_id === ResponseActionsTypes.OSQUERY) {
    return {
      params: {
        ...params,
        ecs_mapping: convertECSMappingToFormValue(params.ecs_mapping),
      },
      actionTypeId: action_type_id,
    };
  }

  return {
    params,
    actionTypeId: action_type_id,
  };
};

export const transformAlertToRuleResponseAction = ({
  actionTypeId,
  params,
}: RuleResponseAction): RuleAlertResponseAction => {
  if (actionTypeId === ResponseActionsTypes.OSQUERY) {
    return {
      params: {
        ...params,
        ecs_mapping: convertECSMappingToObject(params.ecs_mapping),
      },
      action_type_id: actionTypeId,
    };
  }

  return {
    params,
    action_type_id: actionTypeId,
  };
};

export const convertECSMappingToObject = (
  ecsMapping?: EcsMappingFormValueArray
): Record<string, { field?: string; value?: string }> =>
  reduce(
    ecsMapping,
    (acc, value) => {
      if (!isEmpty(value?.key) && !isEmpty(value.result?.type) && !isEmpty(value.result?.value)) {
        acc[value.key] = {
          [value.result.type]: value.result.value,
        };
      }

      return acc;
    },
    {} as Record<string, { field?: string; value?: string }>
  );
