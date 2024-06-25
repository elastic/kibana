/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type {
  UpdateRuleActionV1,
  UpdateRuleRequestBodyV1,
} from '../../../../../../../common/routes/rule/apis/update';
import type { UpdateRuleData } from '../../../../../../application/rule/methods/update';
import type {
  RuleParams,
  ActionRequest,
  SystemActionRequest,
} from '../../../../../../application/rule/types';

export const transformUpdateBodyActions = (actions: UpdateRuleActionV1[]): ActionRequest[] => {
  if (!actions) {
    return [];
  }

  return actions.map(
    ({
      group,
      id,
      params,
      frequency,
      uuid,
      alerts_filter: alertsFilter,
      use_alert_data_for_template: useAlertDataForTemplate,
    }) => {
      return {
        group: group ?? 'default',
        id,
        params,
        ...(uuid ? { uuid } : {}),
        ...(typeof useAlertDataForTemplate !== 'undefined' ? { useAlertDataForTemplate } : {}),
        ...(frequency
          ? {
              frequency: {
                ...omit(frequency, 'notify_when'),
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

export const transformUpdateBodySystemActions = (
  actions: UpdateRuleActionV1[]
): SystemActionRequest[] => {
  if (!actions) {
    return [];
  }

  return actions.map(({ id, params, uuid }) => {
    return {
      id,
      params,
      ...(uuid ? { uuid } : {}),
    };
  });
};

export const transformUpdateBody = <Params extends RuleParams = never>({
  updateBody,
  actions,
  systemActions,
}: {
  updateBody: UpdateRuleRequestBodyV1<Params>;
  actions: UpdateRuleRequestBodyV1<Params>['actions'];
  systemActions: UpdateRuleRequestBodyV1<Params>['actions'];
}): UpdateRuleData<Params> => {
  return {
    name: updateBody.name,
    tags: updateBody.tags,
    ...(updateBody.throttle ? { throttle: updateBody.throttle } : {}),
    params: updateBody.params,
    schedule: updateBody.schedule,
    actions: transformUpdateBodyActions(actions),
    systemActions: transformUpdateBodySystemActions(systemActions),
    ...(updateBody.notify_when ? { notifyWhen: updateBody.notify_when } : {}),
    ...(updateBody.alert_delay ? { alertDelay: updateBody.alert_delay } : {}),
  };
};
