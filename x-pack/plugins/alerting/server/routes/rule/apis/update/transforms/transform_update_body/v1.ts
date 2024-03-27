/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpdateRuleActionV1,
  UpdateRuleRequestBodyV1,
} from '../../../../../../../common/routes/rule/apis/update';
import type { UpdateRuleData } from '../../../../../../application/rule/methods/update';
import type { RuleParams } from '../../../../../../application/rule/types';

const transformUpdateBodyActions = (actions: UpdateRuleActionV1[]): UpdateRuleData['actions'] => {
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

export const transformUpdateBody = <Params extends RuleParams = never>(
  createBody: UpdateRuleRequestBodyV1<Params>
): UpdateRuleData<Params> => {
  return {
    name: createBody.name,
    tags: createBody.tags,
    ...(createBody.throttle ? { throttle: createBody.throttle } : {}),
    params: createBody.params,
    schedule: createBody.schedule,
    actions: transformUpdateBodyActions(createBody.actions),
    ...(createBody.notify_when ? { notifyWhen: createBody.notify_when } : {}),
    ...(createBody.alert_delay ? { alertDelay: createBody.alert_delay } : {}),
  };
};
