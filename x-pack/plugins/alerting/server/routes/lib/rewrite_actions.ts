/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema/src/types/object_type';
import { omit } from 'lodash';
import { NormalizedAlertAction } from '../../rules_client';
import { RuleAction } from '../../types';
import { actionsSchema } from './actions_schema';

export const rewriteActionsReq = (
  actions?: TypeOf<typeof actionsSchema>
): NormalizedAlertAction[] => {
  if (!actions) return [];

  return actions.map(({ frequency, alerts_filter: alertsFilter, ...action }) => {
    return {
      ...action,
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
  const rewriteFrequency = ({ notifyWhen, ...rest }: NonNullable<RuleAction['frequency']>) => ({
    ...rest,
    notify_when: notifyWhen,
  });
  if (!actions) return [];
  return actions.map(({ actionTypeId, frequency, alertsFilter, ...action }) => ({
    ...action,
    connector_type_id: actionTypeId,
    ...(frequency ? { frequency: rewriteFrequency(frequency) } : {}),
    ...(alertsFilter
      ? {
          alerts_filter: alertsFilter,
        }
      : {}),
  }));
};
