/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  IconType,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { intersectionBy } from 'lodash';
import { ActionsProps } from '../types';
import { useFetchRuleActions } from '../../../hooks/use_fetch_rule_actions';
import { useKibana } from '../../../utils/kibana_react';
export function Actions({ ruleActions, actionTypeRegistry }: ActionsProps) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { isLoadingActions, allActions, errorActions } = useFetchRuleActions({ http });
  if (ruleActions && ruleActions.length <= 0) return <EuiText size="s">0</EuiText>;

  function getActionIconClass(actionGroupId?: string): IconType | undefined {
    const actionGroup = actionTypeRegistry.list().find((group) => group.id === actionGroupId);
    return actionGroup?.iconClass;
  }
  const actions = intersectionBy(allActions, ruleActions, 'actionTypeId');
  if (isLoadingActions) return <EuiLoadingSpinner size="s" />;
  return (
    <EuiFlexGroup direction="column">
      {actions.map((actionType) => {
        const actionTypeId = actionType.actionTypeId;
        return (
          <>
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiIcon size="l" type={getActionIconClass(actionType.actionTypeId) ?? 'apps'} />
              </EuiFlexItem>
              <EuiFlexItem>
                {/* TODO: Get the user-typed connector name?  */}
                <EuiText size="m">{actionTypeId}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        );
      })}
      {errorActions && toasts.addDanger({ title: errorActions })}
    </EuiFlexGroup>
  );
}
