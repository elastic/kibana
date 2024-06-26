/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ActionConnector } from '@kbn/alerts-ui-shared';
import { NotificationPolicyWithId } from './create_notification_policy_modal';

interface NotificationPolicyOpts {
  connectors: ActionConnector[];
  policy: NotificationPolicyWithId;
}

export const NotificationPolicy = ({ connectors, policy }: NotificationPolicyOpts) => {
  const runWhenText = (policy.alertType ?? [])
    .map((type: string) => {
      if (type === 'summary') {
        return 'summary of alerts';
      }
      return 'notification for each alert';
    })
    .join(' AND ');

  const frequencyText =
    policy.frequency === 'onActiveAlert'
      ? 'an alert is triggered'
      : policy.frequency === 'onActionGroupChange'
      ? 'an alert changes state'
      : 'on a custom interval';
  const throttleText =
    policy.frequency === 'onThrottleInterval' ? ` of every ${policy.throttle}` : '';

  const getConditionText = (key: string) => {
    if (key === 'active_action_group') {
      return 'alert action group is active for';
    } else if (key === 'recovered_action_group') {
      return 'alert action group is recovered for';
    } else if (key === 'tags') {
      return 'rule tags match';
    }
    return 'rule name matches';
  };
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
          style={{ marginTop: '-3px', marginRight: '-10px', minWidth: '36px' }}
        >
          Send{' '}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginRight: '-10px' }}>
          <EuiBadge>{runWhenText}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          style={{ marginTop: '-3px', marginRight: '-10px', minWidth: '16px' }}
        >
          to{' '}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginRight: '-10px' }}>
          <EuiBadge>
            {policy.connectors
              ?.map((connector: { id: string; params: any }) => {
                const connectorConfig = connectors.find((c) => c.id === connector.id);
                return connectorConfig ? connectorConfig.name : '';
              })
              .join(' AND ')}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          style={{ marginTop: '-3px', marginRight: '-10px', minWidth: '40px' }}
        >
          when{' '}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginRight: '-10px' }}>
          <EuiBadge>
            {frequencyText}
            {throttleText}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ marginTop: '-3px' }}>
          when alert matches the following{' '}
          {policy.conditions.length > 1 ? `${policy.conditions.length}` : ''} condition
          {policy.conditions.length > 1 ? 's' : ''}
          {': '}
        </EuiFlexItem>
      </EuiFlexGroup>
      {policy.conditions.map((condition, index) => {
        return (
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              {'- '}
              {getConditionText(condition.type)}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>{condition.value.join(' AND ')}</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotificationPolicy as default };
