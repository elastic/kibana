/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  IconType,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { suspendedComponentWithProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { ActionsProps } from '../types';
import { useFetchRuleActionConnectors } from '../../../hooks/use_fetch_rule_action_connectors';
import { useKibana } from '../../../utils/kibana_react';

export function Actions({ ruleActions, actionTypeRegistry }: ActionsProps) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { isLoadingActionConnectors, actionConnectors, errorActionConnectors } =
    useFetchRuleActionConnectors({
      http,
      ruleActions,
    });
  useEffect(() => {
    if (errorActionConnectors) {
      toasts.addDanger({ title: errorActionConnectors });
    }
  }, [errorActionConnectors, toasts]);

  if (!actionConnectors || actionConnectors.length <= 0)
    return (
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate('xpack.observability.ruleDetails.noActions', {
            defaultMessage: 'No actions',
          })}
        </EuiText>
      </EuiFlexItem>
    );

  function getActionIconClass(actionGroupId?: string): IconType | undefined {
    const actionGroup = actionTypeRegistry.list().find((group) => group.id === actionGroupId);
    return typeof actionGroup?.iconClass === 'string'
      ? actionGroup?.iconClass
      : suspendedComponentWithProps(actionGroup?.iconClass as React.ComponentType);
  }
  if (isLoadingActionConnectors) return <EuiLoadingSpinner size="s" />;
  return (
    <EuiFlexGroup direction="column">
      {actionConnectors.map(({ actionTypeId, name }) => (
        <React.Fragment key={actionTypeId}>
          <EuiFlexGroup alignItems="center" gutterSize="s" component="span">
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={getActionIconClass(actionTypeId) ?? 'apps'} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText data-test-subj={`actionConnectorName-${name}`} size="s">
                {name}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
}
