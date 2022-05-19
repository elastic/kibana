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
import { i18n } from '@kbn/i18n';
import { ActionsProps } from '../types';
import { useFetchRuleActions } from '../../../hooks/use_fetch_rule_actions';
import { useKibana } from '../../../utils/kibana_react';

interface MapActionTypeIcon {
  [key: string]: string | IconType;
}
const mapActionTypeIcon: MapActionTypeIcon = {
  /* TODO:  Add the rest of the application logs (SVGs ones) */
  '.server-log': 'logsApp',
  '.email': 'email',
  '.pagerduty': 'apps',
  '.index': 'indexOpen',
  '.slack': 'logoSlack',
  '.webhook': 'logoWebhook',
};
export function Actions({ ruleActions }: ActionsProps) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { isLoadingActions, allActions, errorActions } = useFetchRuleActions({ http });
  if (ruleActions && ruleActions.length <= 0)
    return (
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate('xpack.observability.ruleDetails.noActions', {
            defaultMessage: 'No actions',
          })}
        </EuiText>
      </EuiFlexItem>
    );
  const actions = intersectionBy(allActions, ruleActions, 'actionTypeId');
  if (isLoadingActions) return <EuiLoadingSpinner size="s" />;
  return (
    <EuiFlexGroup direction="column">
      {actions.map((action) => (
        <>
          <EuiFlexGroup alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={mapActionTypeIcon[action.actionTypeId] ?? 'apps'} />
            </EuiFlexItem>
            <EuiFlexItem style={{ margin: '0px' }}>
              <EuiText size="s">{action.name}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      ))}
      {errorActions && toasts.addDanger({ title: errorActions })}
    </EuiFlexGroup>
  );
}
