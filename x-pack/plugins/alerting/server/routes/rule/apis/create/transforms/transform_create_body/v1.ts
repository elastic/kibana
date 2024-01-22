/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleActionV1,
  CreateRuleRequestBodyV1,
} from '../../../../../../../common/routes/rule/apis/create';
import type { CreateRuleData } from '../../../../../../application/rule/methods/create';
import type { RuleParams } from '../../../../../../application/rule/types';

const transformCreateBodyActions = (actions: CreateRuleActionV1[]): CreateRuleData['actions'] => {
  if (!actions) return [];

  return actions.map(
    ({
      frequency,
      alerts_filter: alertsFilter,
      use_alert_data_for_template: useAlertDataForTemplate,
      ...action
    }) => {
      return {
        group: action.group,
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        ...(typeof useAlertDataForTemplate !== 'undefined' ? { useAlertDataForTemplate } : {}),
        ...(action.uuid ? { uuid: action.uuid } : {}),
        ...(frequency
          ? {
              frequency: {
                summary: frequency.summary,
                throttle: frequency.throttle,
                notifyWhen: frequency.notify_when,
              },
            }
          : {}),
        ...(alertsFilter ? { alertsFilter } : {}),
      };
    }
  );
};

export const transformCreateBody = <Params extends RuleParams = never>(
  createBody: CreateRuleRequestBodyV1<Params>
): CreateRuleData<Params> => {
  return {
    name: createBody.name,
    alertTypeId: createBody.rule_type_id,
    enabled: createBody.enabled,
    consumer: createBody.consumer,
    tags: createBody.tags,
    ...(createBody.throttle ? { throttle: createBody.throttle } : {}),
    params: createBody.params,
    schedule: createBody.schedule,
    actions: transformCreateBodyActions(createBody.actions),
    ...(createBody.notify_when ? { notifyWhen: createBody.notify_when } : {}),
  };
};
