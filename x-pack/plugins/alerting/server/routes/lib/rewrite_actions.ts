/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema/src/types/object_type';
import { omit } from 'lodash';
import { AsApiContract } from '.';
import { RuleActionResponse, RuleActionTypes, RuleDefaultAction } from '../../../common';
import { isSystemAction } from '../../../common/system_actions/is_system_action';
import { NormalizedAlertAction } from '../../rules_client';
import { RuleAction } from '../../types';
import { actionsSchema } from './actions_schema';

export const rewriteActionsReq = (
  actions: TypeOf<typeof actionsSchema>,
  isSystemConnector: (connectorId: string) => boolean
): NormalizedAlertAction[] => {
  if (!actions || actions.length === 0) {
    return [];
  }

  return actions.map((action) => {
    if (isSystemConnector(action.id)) {
      return {
        id: action.id,
        params: action.params,
        ...(action.uuid ? { uuid: action.uuid } : {}),
        type: RuleActionTypes.SYSTEM,
      };
    }

    const { frequency, alerts_filter: alertsFilter, group } = action;

    return {
      id: action.id,
      params: action.params,
      ...(action.uuid ? { uuid: action.uuid } : {}),
      group: group ?? 'default',
      ...(frequency
        ? {
            frequency: {
              ...omit(frequency, 'notify_when'),
              notifyWhen: frequency.notify_when,
            },
          }
        : {}),
      ...(alertsFilter ? { alertsFilter } : {}),
      type: RuleActionTypes.DEFAULT,
    };
  });
};

export const rewriteActionsRes = (
  actions?: RuleAction[]
): Array<AsApiContract<RuleActionResponse>> => {
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
      const { actionTypeId, type, ...restAction } = action;
      return { ...restAction, connector_type_id: actionTypeId };
    }

    const { actionTypeId, frequency, alertsFilter, type, ...restAction } = action;

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

export const rewriteActionsResLegacy = <T extends { type: RuleActionTypes }>(
  actions?: T[]
): Array<Omit<T, 'type'>> => {
  if (!actions) return [];

  return actions.map(({ type, ...restAction }) => restAction);
};
