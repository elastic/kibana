/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import {
  EuiAccordion,
  EuiNotificationBadge,
  EuiHealth,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';

import { formatResponse } from './policy_response_friendly_names';
import { POLICY_STATUS_TO_HEALTH_COLOR } from '../host_constants';
import {
  Immutable,
  HostPolicyResponseAppliedAction,
  HostPolicyResponseConfiguration,
} from '../../../../../../common/endpoint/types';

/**
 * Nested accordion in the policy response detailing any concerned
 * actions the endpoint took to apply the policy configuration.
 */
const PolicyResponseConfigAccordion = styled(EuiAccordion)`
  > .euiAccordion__triggerWrapper {
    padding: ${(props) => props.theme.eui.paddingSizes.s};
  }
  &.euiAccordion-isOpen {
    background-color: ${(props) => props.theme.eui.euiFocusBackgroundColor};
  }
  .euiAccordion__childWrapper {
    background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  }
  .policyResponseAttentionBadge {
    background-color: ${(props) => props.theme.eui.euiColorDanger};
    color: ${(props) => props.theme.eui.euiColorEmptyShade};
  }
  .euiAccordion__button {
    :hover,
    :focus {
      text-decoration: none;
    }
  }
  :hover:not(.euiAccordion-isOpen) {
    background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  }

  .policyResponseActionsAccordion {
    svg {
      height: ${(props) => props.theme.eui.euiIconSizes.small};
      width: ${(props) => props.theme.eui.euiIconSizes.small};
    }
  }

  .policyResponseStatusHealth {
    width: 100px;
  }
`;

const ResponseActions = memo(
  ({
    actions,
    responseActions,
  }: {
    actions: Immutable<string[]>;
    responseActions: Immutable<HostPolicyResponseAppliedAction[]>;
  }) => {
    return (
      <>
        {actions.map((action, index) => {
          const statuses = responseActions.find((responseAction) => responseAction.name === action);
          if (statuses === undefined) {
            return undefined;
          }
          return (
            <EuiAccordion
              id={action + index}
              key={action + index}
              data-test-subj="hostDetailsPolicyResponseActionsAccordion"
              className="policyResponseActionsAccordion"
              buttonContent={
                <EuiText
                  size="xs"
                  className="eui-textTruncate"
                  data-test-subj="policyResponseAction"
                >
                  <h4>{formatResponse(action)}</h4>
                </EuiText>
              }
              paddingSize="s"
              extraAction={
                <EuiHealth
                  color={POLICY_STATUS_TO_HEALTH_COLOR[statuses.status]}
                  data-test-subj="policyResponseStatusHealth"
                  className="policyResponseStatusHealth"
                >
                  <EuiText size="xs">
                    <p>{formatResponse(statuses.status)}</p>
                  </EuiText>
                </EuiHealth>
              }
            >
              <EuiText size="xs" data-test-subj="policyResponseMessage">
                <p>{statuses.message}</p>
              </EuiText>
            </EuiAccordion>
          );
        })}
      </>
    );
  }
);

ResponseActions.displayName = 'ResponseActions';

/**
 * A policy response is returned by the endpoint and shown in the host details after a user modifies a policy
 */
export const PolicyResponse = memo(
  ({
    responseConfig,
    responseActions,
    responseAttentionCount,
  }: {
    responseConfig: Immutable<HostPolicyResponseConfiguration>;
    responseActions: Immutable<HostPolicyResponseAppliedAction[]>;
    responseAttentionCount: Map<string, number>;
  }) => {
    return (
      <>
        {Object.entries(responseConfig).map(([key, val]) => {
          const attentionCount = responseAttentionCount.get(key);
          return (
            <PolicyResponseConfigAccordion
              id={
                /* eslint-disable-next-line react-hooks/rules-of-hooks */
                useMemo(() => htmlIdGenerator()(), [])
              }
              key={
                /* eslint-disable-next-line react-hooks/rules-of-hooks */
                useMemo(() => htmlIdGenerator()(), [])
              }
              data-test-subj="hostDetailsPolicyResponseConfigAccordion"
              buttonContent={
                <EuiText size="s">
                  <p>{formatResponse(key)}</p>
                </EuiText>
              }
              paddingSize="m"
              extraAction={
                attentionCount &&
                attentionCount > 0 && (
                  <EuiNotificationBadge
                    className="policyResponseAttentionBadge"
                    data-test-subj="hostDetailsPolicyResponseAttentionBadge"
                  >
                    {attentionCount}
                  </EuiNotificationBadge>
                )
              }
            >
              <ResponseActions actions={val.concerned_actions} responseActions={responseActions} />
            </PolicyResponseConfigAccordion>
          );
        })}
      </>
    );
  }
);

PolicyResponse.displayName = 'PolicyResponse';
