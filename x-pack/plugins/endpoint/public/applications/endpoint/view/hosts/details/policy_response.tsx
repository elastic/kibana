/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { EuiAccordion } from '@elastic/eui';
import { EuiNotificationBadge } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';
import {
  HostPolicyResponseActions,
  HostPolicyResponseActionStatus,
} from '../../../../../../common/types';
import { useHostSelector } from '../hooks';
import {
  policyResponseConfigurations,
  policyResponseActions,
} from '../../../store/hosts/selectors';

export const POLICY_STATUS_TO_HEALTH_COLOR = Object.freeze<
  {
    [key in HostPolicyResponseActionStatus]: string;
  }
>({
  [HostPolicyResponseActionStatus.failure]: 'danger',
  [HostPolicyResponseActionStatus.success]: 'success',
  [HostPolicyResponseActionStatus.warning]: 'subdued',
});
const ResponseActions = memo(({ actions }: { actions: Array<keyof HostPolicyResponseActions> }) => {
  const actionStatus: HostPolicyResponseActions = useHostSelector(policyResponseActions);
  return (
    <div>
      {actions.map(action => {
        const statuses = actionStatus[action];
        return (
          <EuiAccordion
            id={action}
            key={action}
            buttonContent={action}
            extraAction={
              <EuiHealth color={POLICY_STATUS_TO_HEALTH_COLOR[statuses.status]}>
                <p>{statuses.status}</p>
              </EuiHealth>
            }
          >
            <div>
              <p>{statuses.message}</p>
            </div>
          </EuiAccordion>
        );
      })}
    </div>
  );
});

export const PolicyResponse = memo(() => {
  const responseConfig = useHostSelector(policyResponseConfigurations);
  return (
    <div>
      {Object.entries(responseConfig).map(([key, val]) => {
        return (
          <EuiAccordion
            id={key}
            buttonContent={key}
            key={key}
            extraAction={
              val.status === 'failure' && (
                <>
                  <span>Failed Processes</span>
                  <EuiNotificationBadge color="accent">2</EuiNotificationBadge>
                </>
              )
            }
          >
            <ResponseActions actions={val.concerned_actions} />
          </EuiAccordion>
        );
      })}
    </div>
  );
});
