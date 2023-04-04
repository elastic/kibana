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

import { LegacyIRuleActionsAttributes } from './types';

/**
 * @deprecated
 * transforms siem legacy actions objects into RawRuleAction
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
          notifyWhen: 'onThrottleInterval',
          throttle: legacyActionsAttr.ruleThrottle,
        },
      },
    ];
  }, []);
};
