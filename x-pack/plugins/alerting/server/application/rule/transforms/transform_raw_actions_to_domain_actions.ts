/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { SavedObjectReference } from '@kbn/core/server';
import { injectReferencesIntoActions } from '../../../rules_client/common';
import { RuleAttributes } from '../../../data/rule/types';
import { RawRule, RuleActionTypes } from '../../../types';
import { RuleDomain } from '../types';

interface Args {
  ruleId: string;
  actions: RuleAttributes['actions'] | RawRule['actions'];
  isSystemAction: (connectorId: string) => boolean;
  omitGeneratedValues?: boolean;
  references?: SavedObjectReference[];
}

export const transformRawActionsToDomainActions = ({
  actions,
  ruleId,
  references,
  omitGeneratedValues = true,
  isSystemAction,
}: Args): RuleDomain['actions'] => {
  const actionsWithInjectedRefs = actions
    ? injectReferencesIntoActions(ruleId, actions, references || [])
    : [];

  const ruleDomainActions: RuleDomain['actions'] = actionsWithInjectedRefs.map((action) => {
    if (isSystemAction(action.id)) {
      return {
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        uuid: action.uuid,
        type: RuleActionTypes.SYSTEM,
      };
    }

    const defaultAction = {
      group: action.group ?? 'default',
      id: action.id,
      params: action.params,
      actionTypeId: action.actionTypeId,
      uuid: action.uuid,
      ...(action.frequency ? { frequency: action.frequency } : {}),
      ...(action.alertsFilter ? { alertsFilter: action.alertsFilter } : {}),
      type: RuleActionTypes.DEFAULT,
    };

    if (omitGeneratedValues) {
      return omit(defaultAction, 'alertsFilter.query.dsl');
    }

    return defaultAction;
  });

  return ruleDomainActions;
};
