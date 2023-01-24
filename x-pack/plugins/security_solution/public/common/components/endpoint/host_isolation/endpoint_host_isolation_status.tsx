/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { EuiBadge, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { AgentPendingActionStatusBadge } from '../agent_pending_action_status_badge';

export interface EndpointHostIsolationStatusProps {
  isIsolated: boolean;
  pendingActions: {
    /** the count of pending isolate actions */
    pendingIsolate?: number;
    /** the count of pending unisolate actions */
    pendingUnIsolate?: number;
    pendingKillProcess?: number;
    pendingSuspendProcess?: number;
    pendingRunningProcesses?: number;
  };
  'data-test-subj'?: string;
}

/**
 * Component will display a host isolation status based on whether it is currently isolated or there are
 * isolate/unisolate actions pending. If none of these are applicable, no UI component will be rendered
 * (`null` is returned)
 */
export const EndpointHostIsolationStatus = memo<EndpointHostIsolationStatusProps>(
  ({ isIsolated, pendingActions, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPendingStatusDisabled = useIsExperimentalFeatureEnabled(
      'disableIsolationUIPendingStatuses'
    );

    const {
      pendingIsolate = 0,
      pendingUnIsolate = 0,
      pendingKillProcess = 0,
      pendingSuspendProcess = 0,
      pendingRunningProcesses = 0,
    } = pendingActions;

    const wasReleasing = useRef<boolean>(false);
    const wasIsolating = useRef<boolean>(false);

    const totalPending = useMemo(
      () =>
        pendingIsolate +
        pendingUnIsolate +
        pendingKillProcess +
        pendingSuspendProcess +
        pendingRunningProcesses,
      [
        pendingIsolate,
        pendingKillProcess,
        pendingRunningProcesses,
        pendingSuspendProcess,
        pendingUnIsolate,
      ]
    );

    const hasMultipleActionTypesPending = useMemo<boolean>(() => {
      return (
        Object.values(pendingActions).reduce((countOfTypes, pendingActionCount) => {
          if (pendingActionCount > 0) {
            return countOfTypes + 1;
          }
          return countOfTypes;
        }, 0) > 1
      );
    }, [pendingActions]);

    useEffect(() => {
      wasReleasing.current = pendingIsolate === 0 && pendingUnIsolate > 0;
      wasIsolating.current = pendingIsolate > 0 && pendingUnIsolate === 0;
    }, [pendingIsolate, pendingUnIsolate]);

    return useMemo(() => {
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
      if (totalPending === 0) {
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
      if (hasMultipleActionTypesPending || (!pendingIsolate && !pendingUnIsolate)) {
        return (
          <AgentPendingActionStatusBadge
            data-test-subj={dataTestSubj}
            pendingActions={pendingActions}
          />
        );
      }

      // show pending isolation badge if a single type of isolation action has pending numbers.
      // We don't care about the count here because if there were more than 1 of the same type
      // (ex. 3 isolate... 0 release), then the action status displayed is still the same - "isolating".
      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          <EuiTextColor color="subdued" data-test-subj={getTestId('pending')}>
            {pendingIsolate ? (
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
    }, [
      isPendingStatusDisabled,
      totalPending,
      hasMultipleActionTypesPending,
      pendingIsolate,
      pendingUnIsolate,
      dataTestSubj,
      getTestId,
      isIsolated,
      pendingActions,
    ]);
  }
);

EndpointHostIsolationStatus.displayName = 'EndpointHostIsolationStatus';
