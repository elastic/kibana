/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { isEmpty } from 'lodash/fp';
import type { SavedObjectReference } from '@kbn/core/server';
import { RawRuleAction } from '../../../types';
import { transformToNotifyWhen } from './transform_to_notify_when';
import { LegacyIRuleActionsAttributes } from './types';
import { transformToAlertThrottle } from './transform_to_alert_throttle';

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 * transforms siem legacy actions {@link LegacyIRuleActionsAttributes} objects into {@link RawRuleAction}
 * @param legacyActionsAttr
 * @param references
 * @returns array of RawRuleAction
 */
export const transformFromLegacyActions = (
  legacyActionsAttr: LegacyIRuleActionsAttributes,
  references: SavedObjectReference[]
): RawRuleAction[] => {
  const actionReference = references.reduce<Record<string, SavedObjectReference>>(
    (acc, reference) => {
      acc[reference.name] = reference;
      return acc;
    },
    {}
  );

  if (isEmpty(actionReference)) {
    throw new Error(`Connector reference id not found.`);
  }

  return legacyActionsAttr.actions.reduce<RawRuleAction[]>((acc, action) => {
    const { actionRef, action_type_id: actionTypeId, group, params } = action;
    if (!actionReference[actionRef]) {
      return acc;
    }
    return [
      ...acc,
      {
        group,
        params,
        uuid: v4(),
        actionRef,
        actionTypeId,
        frequency: {
          summary: true,
          notifyWhen: transformToNotifyWhen(legacyActionsAttr.ruleThrottle) ?? 'onActiveAlert',
          throttle: transformToAlertThrottle(legacyActionsAttr.ruleThrottle),
        },
      },
    ];
  }, []);
};
