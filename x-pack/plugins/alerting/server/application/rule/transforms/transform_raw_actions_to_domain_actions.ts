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
import { RawRule } from '../../../types';
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

  const ruleDomainActions = actionsWithInjectedRefs
    .filter((action) => !isSystemAction(action.id))
    .map((action) => {
      const defaultAction = {
        group: action.group ?? 'default',
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        uuid: action.uuid,
        ...(action.frequency ? { frequency: action.frequency } : {}),
        ...(action.alertsFilter ? { alertsFilter: action.alertsFilter } : {}),
        ...(action.useAlertDataAsTemplate
          ? { useAlertDataAsTemplate: action.useAlertDataAsTemplate }
          : {}),
      };

      if (omitGeneratedValues) {
        return omit(defaultAction, 'alertsFilter.query.dsl');
      }

      return defaultAction;
    });

  return ruleDomainActions;
};

export const transformRawActionsToDomainSystemActions = ({
  actions,
  ruleId,
  references,
  omitGeneratedValues = true,
  isSystemAction,
}: Args): RuleDomain['systemActions'] => {
  const actionsWithInjectedRefs = actions
    ? injectReferencesIntoActions(ruleId, actions, references || [])
    : [];

  const ruleDomainSystemActions = actionsWithInjectedRefs
    .filter((action) => isSystemAction(action.id))
    .map((action) => {
      return {
        id: action.id,
        params: action.params,
        actionTypeId: action.actionTypeId,
        uuid: action.uuid,
        ...(action.useAlertDataAsTemplate
          ? { useAlertDataAsTemplate: action.useAlertDataAsTemplate }
          : {}),
      };
    });

  return ruleDomainSystemActions;
};
