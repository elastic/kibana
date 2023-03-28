/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, sum, values } from 'lodash';
import React, { memo, useRef, useEffect } from 'react';
import { EuiBadge, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetEndpointPendingActionsSummary } from '../../../../management/hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { AgentPendingActionStatusBadge } from '../agent_pending_action_status_badge';
import { getPendingActions } from './utils';

export interface EndpointHostIsolationStatusProps {
  isIsolated: boolean;
  endpointId?: string;
  'data-test-subj'?: string;
}

export interface PendingActions {
  /** the count of pending isolate actions */
  pendingIsolate: number;
  /** the count of pending unisolate actions */
  pendingUnIsolate: number;
  pendingKillProcess: number;
  pendingSuspendProcess: number;
  pendingRunningProcesses: number;
  pendingGetFile: number;
  pendingExecute: number;
}

export type EndpointPendingActionsSummary = PendingActions & {
  hasMultipleActionTypesPending: boolean;
  totalPending: number;
};

/**
 * Component will display a host isolation status based on whether it is currently isolated or there are
 * isolate/unisolate actions pending. If none of these are applicable, no UI component will be rendered
 * (`null` is returned)
 */
export const EndpointHostIsolationStatus = memo<EndpointHostIsolationStatusProps>(
  ({ endpointId, isIsolated, 'data-test-subj': dataTestSubj }) => {
    const { data: endpointPendingActions } =
      useGetEndpointPendingActionsSummary<EndpointPendingActionsSummary>(
        endpointId ? [endpointId] : [],
        {
          select: (pending) => {
            const pendingActions = getPendingActions(pending.data[0]?.pending_actions);
            const pendingActionsValues = values(pendingActions);

            return {
              ...pendingActions,
              hasMultipleActionTypesPending: compact(pendingActionsValues).length > 1,
              totalPending: sum(pendingActionsValues),
            };
          },
        }
      );

    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPendingStatusDisabled = useIsExperimentalFeatureEnabled(
      'disableIsolationUIPendingStatuses'
    );

    const wasReleasing = useRef<boolean>(false);
    const wasIsolating = useRef<boolean>(false);

    useEffect(() => {
      if (endpointPendingActions) {
        wasReleasing.current =
          endpointPendingActions.pendingIsolate === 0 &&
          endpointPendingActions.pendingUnIsolate > 0;
        wasIsolating.current =
          endpointPendingActions.pendingIsolate > 0 &&
          endpointPendingActions.pendingUnIsolate === 0;
      }
    }, [endpointPendingActions]);

    if (isPendingStatusDisabled) {
      // If nothing is pending and host is not currently isolated, then render nothing
      if (!isIsolated) {
        return null;
      }

      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolationStatus.isolated"
            defaultMessage="Isolated"
          />
        </EuiBadge>
      );
    }

    // If nothing is pending
    if (endpointPendingActions?.totalPending === 0 || isIsolated) {
      // and host is either releasing and or currently released, then render nothing
      if ((!wasIsolating.current && wasReleasing.current) || !isIsolated) {
        return null;
      }
      // else host was isolating or is isolated, then show isolation badge
      else if ((!isIsolated && wasIsolating.current && !wasReleasing.current) || isIsolated) {
        return (
          <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isolated"
              defaultMessage="Isolated"
            />
          </EuiBadge>
        );
      }
    }

    // If there are different types of action pending
    //    --OR--
    // the only type of actions pending is NOT isolate/release,
    // then show a summary with tooltip
    if (
      endpointPendingActions &&
      (endpointPendingActions.hasMultipleActionTypesPending ||
        (!endpointPendingActions.pendingIsolate && !endpointPendingActions.pendingUnIsolate))
    ) {
      return (
        <AgentPendingActionStatusBadge
          data-test-subj={dataTestSubj}
          pendingActions={endpointPendingActions}
        />
      );
    }

    // show pending isolation badge if a single type of isolation action has pending numbers.
    // We don't care about the count here because if there were more than 1 of the same type
    // (ex. 3 isolate... 0 release), then the action status displayed is still the same - "isolating".
    return (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
        <EuiTextColor color="subdued" data-test-subj={getTestId('pending')}>
          {endpointPendingActions?.pendingIsolate ? (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isIsolating"
              defaultMessage="Isolating"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isUnIsolating"
              defaultMessage="Releasing"
            />
          )}
        </EuiTextColor>
      </EuiBadge>
    );
  }
);

EndpointHostIsolationStatus.displayName = 'EndpointHostIsolationStatus';
