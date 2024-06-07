/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { DEFAULT_POLL_INTERVAL } from '../../../../../../management/common/constants';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../../../../management/pages/endpoint_hosts/view/host_constants';
import { getEmptyValue } from '../../../../empty_value';

import { useGetEndpointPendingActionsSummary } from '../../../../../../management/hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { useTestIdGenerator } from '../../../../../../management/hooks/use_test_id_generator';
import type { EndpointPendingActions, HostInfo } from '../../../../../../../common/endpoint/types';
import { useGetEndpointDetails } from '../../../../../../management/hooks';
import { getAgentStatusText } from '../../agent_status_text';
import { AgentResponseActionsStatus } from '../agent_response_action_status';

export const ISOLATING_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.agentAndActionsStatus.isIsolating',
  { defaultMessage: 'Isolating' }
);
export const RELEASING_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.agentAndActionsStatus.isUnIsolating',
  { defaultMessage: 'Releasing' }
);
export const ISOLATED_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.agentAndActionsStatus.isolated',
  { defaultMessage: 'Isolated' }
);

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export interface EndpointAgentStatusProps {
  endpointHostInfo: HostInfo;
  /**
   * If set to `true` (Default), then the endpoint isolation state and response actions count
   * will be kept up to date by querying the API periodically.
   * Only used if `pendingActions` is not defined.
   */
  autoRefresh?: boolean;
  /**
   * The pending actions for the host (as return by the pending actions summary api).
   * If undefined, then this component will call the API to retrieve that list of pending actions.
   * NOTE: if this prop is defined, it will invalidate `autoRefresh` prop.
   */
  pendingActions?: EndpointPendingActions['pending_actions'];
  'data-test-subj'?: string;
}

/**
 * Displays the status of an Endpoint agent along with its Isolation state or the number of pending
 * response actions against it.
 *
 * TIP: if you only have the Endpoint's `agent.id`, then consider using `EndpointAgentStatusById`,
 * which will call the needed APIs to get the information necessary to display the status.
 */

// TODO: used by `EndpointAgentStatusById`
// remove usage/code when `agentStatusClientEnabled` FF is enabled and removed
export const EndpointAgentStatus = memo<EndpointAgentStatusProps>(
  ({ endpointHostInfo, autoRefresh = true, pendingActions, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { data: endpointPendingActions } = useGetEndpointPendingActionsSummary(
      [endpointHostInfo.metadata.agent.id],
      {
        refetchInterval: autoRefresh ? DEFAULT_POLL_INTERVAL : false,
        enabled: !pendingActions,
      }
    );

    const [hasPendingActions, hostPendingActions] = useMemo<
      [boolean, EndpointPendingActions['pending_actions']]
    >(() => {
      if (!endpointPendingActions && !pendingActions) {
        return [false, {}];
      }

      const pending = pendingActions
        ? pendingActions
        : endpointPendingActions?.data[0].pending_actions ?? {};

      return [Object.keys(pending).length > 0, pending];
    }, [endpointPendingActions, pendingActions]);

    const status = endpointHostInfo.host_status;
    const isIsolated = Boolean(endpointHostInfo.metadata.Endpoint.state?.isolation);

    return (
      <EuiFlexGroupStyled
        gutterSize="none"
        responsive={false}
        className="eui-textTruncate"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={status != null ? HOST_STATUS_TO_BADGE_COLOR[status] : 'warning'}
            data-test-subj={getTestId('agentStatus')}
            className="eui-textTruncate"
          >
            {getAgentStatusText(status)}
          </EuiBadge>
        </EuiFlexItem>
        {(isIsolated || hasPendingActions) && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <AgentResponseActionsStatus
              data-test-subj={getTestId('actionStatuses')}
              isIsolated={isIsolated}
              pendingActions={hostPendingActions}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroupStyled>
    );
  }
);
EndpointAgentStatus.displayName = 'EndpointAgentStatus';

export interface EndpointAgentStatusByIdProps {
  endpointAgentId: string;
  /**
   * If set to `true` (Default), then the endpoint status and isolation/action counts will
   * be kept up to date by querying the API periodically
   */
  autoRefresh?: boolean;
  'data-test-subj'?: string;
}

/**
 * Given an Endpoint Agent Id, it will make the necessary API calls and then display the agent
 * status using the `<EndpointAgentStatus />` component.
 *
 * NOTE: if the `HostInfo` is already available, consider using `<EndpointAgentStatus/>` component
 * instead in order to avoid duplicate API calls.
 */
export const EndpointAgentStatusById = memo<EndpointAgentStatusByIdProps>(
  ({ endpointAgentId, autoRefresh, 'data-test-subj': dataTestSubj }) => {
    const { data } = useGetEndpointDetails(endpointAgentId, {
      refetchInterval: autoRefresh ? DEFAULT_POLL_INTERVAL : false,
    });

    if (!data) {
      return (
        <EuiText size="xs" data-test-subj={dataTestSubj}>
          <p>{getEmptyValue()}</p>
        </EuiText>
      );
    }

    return (
      <EndpointAgentStatus
        endpointHostInfo={data}
        data-test-subj={dataTestSubj}
        autoRefresh={autoRefresh}
      />
    );
  }
);
EndpointAgentStatusById.displayName = 'EndpointAgentStatusById';
