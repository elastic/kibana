/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import {
  HostPolicyResponseAppliedAction,
  HostPolicyResponseConfiguration,
  Immutable,
} from '../../../../common/endpoint/types';
import { POLICY_STATUS_TO_HEALTH_COLOR } from '../../pages/endpoint_hosts/view/host_constants';
import { formatResponse, PolicyResponseActionFormatter } from './policy_response_friendly_names';
import { PolicyResponseErrorCallout } from './policy_response_error_callout';

/**
 * Nested accordion in the policy response detailing any concerned
 * actions the endpoint took to apply the policy configuration.
 */
const PolicyResponseConfigAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    padding: ${(props) => props.theme.eui.paddingSizes.xs};
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

  .policyResponseStatusHealth {
    width: 100px;
  }

  .policyResponseMessage {
    padding-left: ${(props) => props.theme.eui.paddingSizes.l};
  }

  .euiCallOut.policyResponseErrorCallOut {
    margin-left: ${(props) => props.theme.eui.paddingSizes.l};
  }
`;

const PolicyResponseActions = memo(
  ({
    actions,
    responseActions,
    addPolicyResponseError,
  }: {
    actions: Immutable<string[]>;
    responseActions: Immutable<HostPolicyResponseAppliedAction[]>;
    addPolicyResponseError: (policyResponseError: PolicyResponseActionFormatter) => void;
  }) => {
    return (
      <>
        {actions.map((action, index) => {
          const policyResponseAppliedAction = responseActions.find(
            (responseAction) => responseAction.name === action
          );
          if (policyResponseAppliedAction === undefined) {
            return undefined;
          }
          const policyResponseActionFormatter = new PolicyResponseActionFormatter(
            policyResponseAppliedAction
          );

          if (policyResponseActionFormatter.hasError) {
            addPolicyResponseError(policyResponseActionFormatter);
          }

          const key = action + index;
          return (
            <EuiAccordion
              id={key}
              key={key}
              data-test-subj="endpointDetailsPolicyResponseActionsAccordion"
              className="policyResponseActionsAccordion"
              buttonContent={
                <EuiText
                  size="xs"
                  className="eui-textTruncate"
                  data-test-subj="policyResponseAction"
                >
                  <h4>{policyResponseActionFormatter.title}</h4>
                </EuiText>
              }
              paddingSize="s"
              extraAction={
                <EuiHealth
                  color={POLICY_STATUS_TO_HEALTH_COLOR[policyResponseAppliedAction.status]}
                  data-test-subj="policyResponseStatusHealth"
                  className="policyResponseStatusHealth"
                >
                  <EuiText size="xs">
                    <p>{policyResponseActionFormatter.status}</p>
                  </EuiText>
                </EuiHealth>
              }
            >
              <EuiText size="xs" data-test-subj="policyResponseMessage">
                {policyResponseActionFormatter.hasError ? (
                  <PolicyResponseErrorCallout policyResponseError={policyResponseActionFormatter} />
                ) : (
                  <p className="policyResponseMessage">{policyResponseAppliedAction.message}</p>
                )}
              </EuiText>
            </EuiAccordion>
          );
        })}
      </>
    );
  }
);

PolicyResponseActions.displayName = 'PolicyResponseActions';

interface PolicyResponseProps {
  policyResponseConfig: Immutable<HostPolicyResponseConfiguration>;
  policyResponseActions: Immutable<HostPolicyResponseAppliedAction[]>;
  policyResponseAttentionCount: Map<string, number>;
  addPolicyResponseError: (policyResponseError: PolicyResponseActionFormatter) => void;
}

/**
 * A policy response is returned by the endpoint and shown in the host details after a user modifies a policy
 */
export const PolicyResponse = memo(
  ({
    policyResponseConfig,
    policyResponseActions,
    policyResponseAttentionCount,
    addPolicyResponseError,
  }: PolicyResponseProps) => {
    const generateId = useMemo(() => htmlIdGenerator(), []);
    return (
      <>
        {Object.entries(policyResponseConfig).map(([key, val]) => {
          const attentionCount = policyResponseAttentionCount.get(key);
          return (
            <PolicyResponseConfigAccordion
              id={generateId(`id_${key}`)}
              key={generateId(`key_${key}`)}
              data-test-subj="endpointDetailsPolicyResponseConfigAccordion"
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
                    data-test-subj="endpointDetailsPolicyResponseAttentionBadge"
                  >
                    {attentionCount}
                  </EuiNotificationBadge>
                )
              }
            >
              <PolicyResponseActions
                actions={val.concerned_actions}
                responseActions={policyResponseActions}
                addPolicyResponseError={addPolicyResponseError}
              />
            </PolicyResponseConfigAccordion>
          );
        })}
      </>
    );
  }
);

PolicyResponse.displayName = 'PolicyResponse';
