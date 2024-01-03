/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema/src/types/object_type';
import { omit } from 'lodash';
import { NormalizedAlertAction } from '../../rules_client';
import { actionsSchema } from './actions_schema';
import { RuleActionTypes } from '../../../common';

export const rewriteActionsReq = (
  actions: TypeOf<typeof actionsSchema>,
  isSystemAction: (connectorId: string) => boolean
): NormalizedAlertAction[] => {
  if (!actions) return [];

  return actions.map(
    ({
      frequency,
      alerts_filter: alertsFilter,
      use_alert_data_for_template: useAlertDataForTemplate,
      ...action
    }) => {
      if (isSystemAction(action.id)) {
        return {
          id: action.id,
          params: action.params,
          ...(typeof useAlertDataForTemplate !== 'undefined' ? { useAlertDataForTemplate } : {}),
          ...(action.uuid ? { uuid: action.uuid } : {}),
          type: RuleActionTypes.SYSTEM,
        };
      }

      return {
        group: action.group ?? 'default',
        id: action.id,
        params: action.params,
        ...(action.uuid ? { uuid: action.uuid } : {}),
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
        type: RuleActionTypes.DEFAULT,
      };
    }
  );
};
