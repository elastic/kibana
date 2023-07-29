/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema/src/types/object_type';
import { omit } from 'lodash';
import { RuleActionTypes, RuleDefaultAction } from '../../../common';
import { isSystemAction } from '../../lib/is_system_action';
import { NormalizedAlertAction } from '../../rules_client';
import { RuleAction } from '../../types';
import { actionsSchema } from './actions_schema';

export const rewriteActionsReq = (
  actions?: TypeOf<typeof actionsSchema>
): NormalizedAlertAction[] => {
  if (!actions) return [];

  return actions.map((action) => {
    if (action.type === RuleActionTypes.SYSTEM) {
      return action;
    }

    const { frequency, alerts_filter: alertsFilter, ...restAction } = action;

    return {
      ...restAction,
      ...(frequency
        ? {
            frequency: {
              ...omit(frequency, 'notify_when'),
              notifyWhen: frequency.notify_when,
            },
          }
        : {}),
      ...(alertsFilter ? { alertsFilter } : {}),
    };
  });
};

export const rewriteActionsRes = (actions?: RuleAction[]) => {
  const rewriteFrequency = ({
    notifyWhen,
    ...rest
  }: NonNullable<RuleDefaultAction['frequency']>) => ({
    ...rest,
    notify_when: notifyWhen,
  });

  if (!actions) return [];

  return actions.map((action) => {
    if (isSystemAction(action)) {
      return { ...action, connector_type_id: action.actionTypeId };
    }

    const { actionTypeId, frequency, alertsFilter, ...restAction } = action;

    return {
      ...restAction,
      connector_type_id: actionTypeId,
      ...(frequency ? { frequency: rewriteFrequency(frequency) } : {}),
      ...(alertsFilter
        ? {
            alerts_filter: alertsFilter,
          }
        : {}),
    };
  });
};
