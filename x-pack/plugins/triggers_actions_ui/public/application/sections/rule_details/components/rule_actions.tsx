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
import { i18n } from '@kbn/i18n';
import { RuleNotifyWhenType } from '@kbn/alerting-plugin/common';
import { ActionTypeRegistryContract, suspendedComponentWithProps } from '../../../..';
import { useFetchRuleActionConnectors } from '../../../hooks/use_fetch_rule_action_connectors';
import { NOTIFY_WHEN_OPTIONS } from '../../rule_form/rule_notify_when';
import { RuleUiAction } from '../../../../types';

export interface RuleActionsProps {
  ruleActions: RuleUiAction[];
  actionTypeRegistry: ActionTypeRegistryContract;
  legacyNotifyWhen?: RuleNotifyWhenType | null;
}

export function RuleActions({
  ruleActions,
  actionTypeRegistry,
  legacyNotifyWhen,
}: RuleActionsProps) {
  const { isLoadingActionConnectors, actionConnectors } = useFetchRuleActionConnectors({
    ruleActions,
  });

  const hasConnectors = actionConnectors && actionConnectors.length > 0;

  const hasActions = ruleActions && ruleActions.length > 0;

  if (!hasConnectors || !hasActions) {
    return (
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate('xpack.triggersActionsUI.ruleDetails.noActions', {
            defaultMessage: 'No actions',
          })}
        </EuiText>
      </EuiFlexItem>
    );
  }

  const getNotifyText = (action: RuleUiAction, isSystemAction?: boolean) => {
    if (isSystemAction) {
      return NOTIFY_WHEN_OPTIONS[1].inputDisplay;
    }

    return (
      ('frequency' in action &&
        (NOTIFY_WHEN_OPTIONS.find((options) => options.value === action.frequency?.notifyWhen)
          ?.inputDisplay ||
          action.frequency?.notifyWhen)) ??
      legacyNotifyWhen
    );
  };

  const getActionIconClass = (actionGroupId?: string): IconType | undefined => {
    const actionGroup = actionTypeRegistry.list().find((group) => group.id === actionGroupId);
    return typeof actionGroup?.iconClass === 'string'
      ? actionGroup?.iconClass
      : suspendedComponentWithProps(actionGroup?.iconClass as React.ComponentType);
  };

  const getActionName = (actionTypeId?: string) => {
    const actionConnector = actionConnectors.find((connector) => connector.id === actionTypeId);
    return actionConnector?.name;
  };

  if (isLoadingActionConnectors) return <EuiLoadingSpinner size="s" />;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {ruleActions.map((action, index) => {
        const { actionTypeId, id } = action;
        const actionName = getActionName(id);
        return (
          <EuiFlexItem key={index}>
            <EuiFlexGroup alignItems="center" gutterSize="s" component="span">
              <EuiFlexItem grow={false}>
                <EuiIcon size="m" type={getActionIconClass(actionTypeId) ?? 'apps'} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  data-test-subj={`actionConnectorName-${index}-${actionName || actionTypeId}`}
                  size="s"
                >
                  {actionName}
                </EuiText>
                <EuiFlexGroup alignItems="center" gutterSize="xs" component="span">
                  <EuiSpacer size="xs" />
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="s" type="bell" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText
                      data-test-subj={`actionConnectorName-${index}-${actionName || actionTypeId}`}
                      size="xs"
                    >
                      {String(
                        getNotifyText(
                          action,
                          actionTypeRegistry.get(actionTypeId).isSystemActionType
                        )
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
