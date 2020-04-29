/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiAccordion, EuiNotificationBadge, EuiHealth } from '@elastic/eui';
import {
  HostPolicyResponseActions,
  HostPolicyResponseActionStatus,
  HostPolicyResponseConfiguration,
  Immutable,
  ImmutableArray,
} from '../../../../../../common/types';

const HostPolicyResponse = styled.div`
margin: {props => props.theme.eui.ruleMargins.marginXLarge};
`;

export const POLICY_STATUS_TO_HEALTH_COLOR = Object.freeze<
  {
    [key in HostPolicyResponseActionStatus]: string;
  }
>({
  [HostPolicyResponseActionStatus.failure]: 'danger',
  [HostPolicyResponseActionStatus.success]: 'success',
  [HostPolicyResponseActionStatus.warning]: 'subdued',
});
const ResponseActions = memo(
  ({
    actions,
    actionStatus,
  }: {
    actions: ImmutableArray<string>;
    actionStatus: Partial<HostPolicyResponseActions>;
  }) => {
    return (
      <HostPolicyResponse>
        {actions.map(action => {
          const statuses = actionStatus[action];
          if (statuses === undefined) {
            return undefined;
          }
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
      </HostPolicyResponse>
    );
  }
);

/**
 * this is for the policy response shown in the host details after a user modifies a policy
 */
export const PolicyResponse = memo(
  ({
    responseConfig,
    responseActionStatus,
  }: {
    responseConfig: Immutable<HostPolicyResponseConfiguration>;
    responseActionStatus: Partial<HostPolicyResponseActions>;
  }) => {
    return (
      <div>
        {Object.entries(responseConfig).map(([key, val]) => {
          return (
            <EuiAccordion
              id={key}
              className="hostPolicyResponseActionAccordion"
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
              <ResponseActions
                actions={val.concerned_actions}
                actionStatus={responseActionStatus}
              />
            </EuiAccordion>
          );
        })}
      </div>
    );
  }
);
