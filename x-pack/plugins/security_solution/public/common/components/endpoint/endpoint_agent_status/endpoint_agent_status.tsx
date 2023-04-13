/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMANDS_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { useGetEndpointPendingActionsSummary } from '../../../../management/hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import type { HostInfo, EndpointPendingActions } from '../../../../../common/endpoint/types';
import { AgentStatus } from '../agent_status';

const TOOLTIP_CONTENT_STYLES: React.CSSProperties = Object.freeze({ width: 150 });

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  .isolation-status {
    margin-left: ${({ theme }) => theme.eui.euiSizeS};
  }
`;

export interface EndpointAgentStatusProps {
  endpointHostInfo: HostInfo;
  'data-test-subj'?: string;
}

/**
 * Displays the status of an Endpoint agent along with its Isolation state or the number of pending
 * response actions against it.
 */
export const EndpointAgentStatus = memo<EndpointAgentStatusProps>(
  ({ endpointHostInfo, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { data: endpointPendingActions } = useGetEndpointPendingActionsSummary(
      [endpointHostInfo.metadata.agent.id],
      {
        refetchInterval: 10000,
      }
    );

    const [hasPendingActions, hostPendingActions] = useMemo<
      [boolean, EndpointPendingActions['pending_actions']]
    >(() => {
      if (!endpointPendingActions) {
        return [false, {}];
      }

      const pendingActions = endpointPendingActions.data[0].pending_actions ?? {};

      return [Object.keys(pendingActions).length > 0, pendingActions];
    }, [endpointPendingActions]);

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
          <AgentStatus hostStatus={status} />
        </EuiFlexItem>
        {(isIsolated || hasPendingActions) && (
          <EuiFlexItem grow={false} className="eui-textTruncate isolation-status">
            <EndpointHostResponseActionsStatus
              data-test-subj={getTestId('isolationStatus')}
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

interface EndpointHostResponseActionsStatusProps {
  /** The host's individual pending action list as return by the pending action summary api */
  pendingActions: EndpointPendingActions['pending_actions'];
  /** Is host currently isolated */
  isIsolated: boolean;
  'data-test-subj'?: string;
}

const EndpointHostResponseActionsStatus = memo<EndpointHostResponseActionsStatusProps>(
  ({ pendingActions, isIsolated, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPendingStatusDisabled = useIsExperimentalFeatureEnabled(
      'disableIsolationUIPendingStatuses'
    );

    interface PendingActionsState {
      actionList: Array<{ label: string; count: number }>;
      totalPending: number;
      wasReleasing: boolean;
      wasIsolating: boolean;
      hasMultipleActionTypesPending: boolean;
      hasPendingIsolate: boolean;
      hasPendingUnIsolate: boolean;
    }

    const {
      totalPending,
      actionList,
      wasReleasing,
      wasIsolating,
      hasMultipleActionTypesPending,
      hasPendingIsolate,
      hasPendingUnIsolate,
    } = useMemo<PendingActionsState>(() => {
      const list: Array<{ label: string; count: number }> = [];
      let actionTotal = 0;
      let actionTypesCount = 0;

      Object.entries(pendingActions).forEach(([actionName, actionCount]) => {
        actionTotal += actionCount;
        actionTypesCount += 1;

        list.push({
          count: actionCount,
          label:
            RESPONSE_ACTION_API_COMMANDS_TO_CONSOLE_COMMAND_MAP[
              actionName as ResponseActionsApiCommandNames
            ] ?? actionName,
        });
      });

      const pendingIsolate = pendingActions.isolate ?? 0;
      const pendingUnIsolate = pendingActions.unisolate ?? 0;

      return {
        actionList: list,
        totalPending: actionTotal,
        wasReleasing: pendingIsolate === 0 && pendingUnIsolate > 0,
        wasIsolating: pendingIsolate > 0 && pendingUnIsolate === 0,
        hasMultipleActionTypesPending: actionTypesCount > 1,
        hasPendingIsolate: pendingIsolate > 0,
        hasPendingUnIsolate: pendingUnIsolate > 0,
      };
    }, [pendingActions]);

    const isolatedBadge = useMemo(() => {
      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.agentAndActionsStatus.isolated"
            defaultMessage="Isolated"
          />
        </EuiBadge>
      );
    }, [dataTestSubj]);

    if (isPendingStatusDisabled) {
      // If nothing is pending and host is not currently isolated, then render nothing
      if (!isIsolated) {
        return null;
      }

      return isolatedBadge;
    }

    // If nothing is pending
    if (totalPending === 0) {
      // and host is either releasing and or currently released, then render nothing
      if ((!wasIsolating && wasReleasing) || !isIsolated) {
        return null;
      }
      // else host was isolating or is isolated, then show isolation badge
      else if ((!isIsolated && wasIsolating && !wasReleasing) || isIsolated) {
        return isolatedBadge;
      }
    }

    // If there are different types of action pending
    //    --OR--
    // the only type of actions pending is NOT isolate/release,
    // then show a summary with tooltip
    if (hasMultipleActionTypesPending || (!hasPendingIsolate && !hasPendingUnIsolate)) {
      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          <EuiToolTip
            display="block"
            anchorClassName="eui-textTruncate"
            content={
              <div style={TOOLTIP_CONTENT_STYLES} data-test-subj={`${dataTestSubj}-tooltipContent`}>
                <div>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.agentAndActionsStatus.tooltipPendingActions"
                    defaultMessage="Pending actions:"
                  />
                </div>
                {actionList.map(({ count, label }) => {
                  return (
                    <EuiFlexGroup gutterSize="none" key={label}>
                      <EuiFlexItem>{label}</EuiFlexItem>
                      <EuiFlexItem grow={false}>{count}</EuiFlexItem>
                    </EuiFlexGroup>
                  );
                })}
              </div>
            }
          >
            <EuiTextColor color="subdued" data-test-subj={`${dataTestSubj}-pending`}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.agentAndActionsStatus.multiplePendingActions"
                defaultMessage="{count} {count, plural, one {action} other {actions}} pending"
                values={{
                  count: totalPending,
                }}
              />
            </EuiTextColor>
          </EuiToolTip>
        </EuiBadge>
      );
    }

    // show pending isolation badge if a single type of isolation action has pending numbers.
    // We don't care about the count here because if there were more than 1 of the same type
    // (ex. 3 isolate... 0 release), then the action status displayed is still the same - "isolating".
    return (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
        <EuiTextColor color="subdued" data-test-subj={getTestId('pending')}>
          {hasPendingIsolate ? (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.agentAndActionsStatus.isIsolating"
              defaultMessage="Isolating"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.agentAndActionsStatus.isUnIsolating"
              defaultMessage="Releasing"
            />
          )}
        </EuiTextColor>
      </EuiBadge>
    );
  }
);
EndpointHostResponseActionsStatus.displayName = 'EndpointHostResponseActionsStatus';
