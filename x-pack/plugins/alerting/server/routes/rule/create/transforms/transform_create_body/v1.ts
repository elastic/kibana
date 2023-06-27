/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleActionV1,
  CreateRuleRequestBodyV1,
} from '../../../../../../common/routes/rule/create';
import type { CreateRuleData } from '../../../../../application/rule/create';

const transformCreateBodyActions = (actions: CreateRuleActionV1[]): CreateRuleData['actions'] => {
  if (!actions) return [];

  return actions.map(({ frequency, alerts_filter: alertsFilter, ...action }) => {
    return {
      group: action.group,
      id: action.id,
      params: action.params,
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
  });
};

export const transformCreateBody = (createBody: CreateRuleRequestBodyV1): CreateRuleData => {
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
