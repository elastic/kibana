/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiAccordion, EuiNotificationBadge, EuiHealth } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import {
  HostPolicyResponseActions,
  HostPolicyResponseActionStatus,
  HostPolicyResponseConfiguration,
  Immutable,
  ImmutableArray,
} from '../../../../../../common/types';
import { formatResponse } from './policyResponseFriendlyNames';

const PolicyResponseConfigAccordion = styled(EuiAccordion)`
  > .euiAccordion__triggerWrapper > .euiAccordion__optionalAction {
    margin-right: ${props => props.theme.eui.ruleMargins.marginMedium};
  }
  &.euiAccordion-isOpen {
    background-color: ${props => props.theme.eui.euiFocusBackgroundColor};
  }
  .euiAccordion__childWrapper {
    background-color: ${props => props.theme.eui.euiColorLightestShade};
  }
  .policyResponseFailedBadge {
    background-color: ${props => props.theme.eui.euiColorDanger};
    color: ${props => props.theme.eui.euiColorEmptyShade};
  }
  :hover:not(.euiAccordion-isOpen) {
    background-color: ${props => props.theme.eui.euiColorLightestShade};
  }
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
      <>
        {actions.map(action => {
          const statuses = actionStatus[action];
          if (statuses === undefined) {
            return undefined;
          }
          return (
            <EuiAccordion
              id={action}
              key={action}
              buttonContent={
                <EuiText size="xs">
                  <h4>{formatResponse(action)}</h4>
                </EuiText>
              }
              paddingSize="s"
              extraAction={
                <EuiHealth color={POLICY_STATUS_TO_HEALTH_COLOR[statuses.status]}>
                  <p>{formatResponse(statuses.status)}</p>
                </EuiHealth>
              }
            >
              <EuiText size="xs">
                <p>{statuses.message}</p>
              </EuiText>
            </EuiAccordion>
          );
        })}
      </>
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
      <>
        {Object.entries(responseConfig).map(([key, val]) => {
          return (
            <PolicyResponseConfigAccordion
              id={key}
              buttonContent={
                <EuiText size="s">
                  <p>{formatResponse(key)}</p>
                </EuiText>
              }
              key={key}
              paddingSize="m"
              extraAction={
                val.status === 'failure' && (
                  <EuiNotificationBadge className="policyResponseFailedBadge">
                    2
                  </EuiNotificationBadge>
                )
              }
            >
              <ResponseActions
                actions={val.concerned_actions}
                actionStatus={responseActionStatus}
              />
            </PolicyResponseConfigAccordion>
          );
        })}
      </>
    );
  }
);
