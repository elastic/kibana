/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { ISOLATED_LABEL, ISOLATING_LABEL, RELEASING_LABEL } from './translations';
import type { EndpointPendingActions } from '../../../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../../common/endpoint/service/response_actions/constants';
import { useTestIdGenerator } from '../../../../../management/hooks/use_test_id_generator';

const TOOLTIP_CONTENT_STYLES: React.CSSProperties = Object.freeze({ width: 150 });

interface AgentResponseActionsStatusProps {
  /** The host's individual pending action list as return by the pending action summary api */
  pendingActions: EndpointPendingActions['pending_actions'];
  /** Is host currently isolated */
  isIsolated: boolean;
  'data-test-subj'?: string;
}

export const AgentResponseActionsStatus = memo<AgentResponseActionsStatusProps>(
  ({ pendingActions, isIsolated, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

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
      const pendingActionEntries = Object.entries(pendingActions);
      const actionTypesCount = pendingActionEntries.length;

      pendingActionEntries.sort().forEach(([actionName, actionCount]) => {
        actionTotal += actionCount;

        list.push({
          count: actionCount,
          label:
            RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[
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

    const badgeDisplayValue = useMemo(() => {
      return hasPendingIsolate ? (
        ISOLATING_LABEL
      ) : hasPendingUnIsolate ? (
        RELEASING_LABEL
      ) : isIsolated ? (
        ISOLATED_LABEL
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.agentStatus.actionStatus.multiplePendingActions"
          defaultMessage="{count} {count, plural, one {action} other {actions}} pending"
          values={{
            count: totalPending,
          }}
        />
      );
    }, [hasPendingIsolate, hasPendingUnIsolate, isIsolated, totalPending]);

    const isolatedBadge = useMemo(() => {
      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          {ISOLATED_LABEL}
        </EuiBadge>
      );
    }, [dataTestSubj]);

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
        <EuiBadge color="hollow" data-test-subj={dataTestSubj} iconType="plus" iconSide="right">
          <EuiToolTip
            display="block"
            anchorClassName="eui-textTruncate"
            anchorProps={{ 'data-test-subj': getTestId('tooltipTrigger') }}
            content={
              <div style={TOOLTIP_CONTENT_STYLES} data-test-subj={`${dataTestSubj}-tooltipContent`}>
                <div>
                  <FormattedMessage
                    id="xpack.securitySolution.agentStatus.actionStatus.tooltipPendingActions"
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
              {badgeDisplayValue}
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
          {badgeDisplayValue}
        </EuiTextColor>
      </EuiBadge>
    );
  }
);
AgentResponseActionsStatus.displayName = 'AgentResponseActionsStatus';
