/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiIcon,
  EuiText,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import type { ActionStatus } from '../../../../../types';

import { ViewErrors } from '../view_errors';

import {
  formattedTime,
  getAction,
  inProgressDescription,
  inProgressTitle,
  inProgressTitleColor,
} from './helpers';
import { ViewAgentsButton } from './view_agents_button';

export const ActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, onClickViewAgents }) => {
  const completeTitle =
    action.type === 'POLICY_CHANGE' && action.nbAgentsActioned === 0 ? (
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.agentActivity.policyChangeCompletedTitle"
          defaultMessage="Policy changed"
        />
      </EuiText>
    ) : (
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.agentActivity.completedTitle"
          defaultMessage="{nbAgents} {agents} {completedText}{offlineText}"
          values={{
            nbAgents:
              action.nbAgentsAck === action.nbAgentsActioned
                ? action.nbAgentsAck
                : action.nbAgentsAck + ' of ' + action.nbAgentsActioned,
            agents: action.nbAgentsActioned === 1 ? 'agent' : 'agents',
            completedText: getAction(action.type).completedText,
            offlineText:
              action.status === 'ROLLOUT_PASSED' && action.nbAgentsActioned - action.nbAgentsAck > 0
                ? `, ${
                    action.nbAgentsActioned - action.nbAgentsAck
                  } agent(s) offline during the rollout period`
                : '',
          }}
        />
      </EuiText>
    );

  const completedDescription = (
    <FormattedMessage
      id="xpack.fleet.agentActivityFlyout.completedDescription"
      defaultMessage="Completed {date}"
      values={{
        date: formattedTime(action.completionTime),
      }}
    />
  );

  const failedDescription = (
    <EuiText color="subdued">
      <p>
        <FormattedMessage
          id="xpack.fleet.agentActivityFlyout.failureDescription"
          defaultMessage="A problem occurred during this operation."
        />
        &nbsp;
        {inProgressDescription(action.creationTime)}
      </p>
    </EuiText>
  );

  const displayByStatus: {
    [key: string]: {
      icon: ReactNode;
      title: ReactNode;
      titleColor: string;
      description: ReactNode | null;
    };
  } = {
    IN_PROGRESS: {
      icon: <EuiLoadingSpinner size="m" />,
      title: <EuiText>{inProgressTitle(action)}</EuiText>,
      titleColor: inProgressTitleColor,
      description: <EuiText color="subdued">{inProgressDescription(action.creationTime)}</EuiText>,
    },
    ROLLOUT_PASSED: {
      icon:
        action.nbAgentsFailed > 0 ? (
          <EuiIcon size="m" type="warning" color="red" />
        ) : (
          <EuiIcon size="m" type="checkInCircleFilled" color="green" />
        ),
      title: completeTitle,
      titleColor: action.nbAgentsFailed > 0 ? 'red' : 'green',
      description:
        action.nbAgentsFailed > 0 ? (
          failedDescription
        ) : (
          <EuiText color="subdued">{completedDescription}</EuiText>
        ),
    },
    COMPLETE: {
      icon: <EuiIcon size="m" type="checkInCircleFilled" color="green" />,
      title: completeTitle,
      titleColor: 'green',
      description:
        action.type === 'POLICY_REASSIGN' && action.newPolicyId ? (
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.reassignCompletedDescription"
                defaultMessage="Assigned to {policy}."
                values={{
                  policy: action.newPolicyId,
                }}
              />{' '}
              {completedDescription}
            </p>
          </EuiText>
        ) : action.type === 'POLICY_CHANGE' ? (
          <EuiText color="subdued">
            <p>
              <b>{action.policyId}</b>{' '}
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.policyChangedDescription"
                defaultMessage="changed to revision {rev} at {date}."
                values={{
                  rev: action.revision,
                  date: formattedTime(action.creationTime),
                }}
              />
            </p>
          </EuiText>
        ) : (
          <EuiText color="subdued">{completedDescription}</EuiText>
        ),
    },
    FAILED: {
      icon: <EuiIcon size="m" type="warning" color="red" />,
      title: completeTitle,
      titleColor: 'red',
      description: failedDescription,
    },
    CANCELLED: {
      icon: <EuiIcon size="m" type="warning" color="grey" />,
      titleColor: 'grey',
      title: (
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.cancelledTitle"
            defaultMessage="Agent {cancelledText} cancelled"
            values={{
              cancelledText: getAction(action.type).cancelledText,
            }}
          />
        </EuiText>
      ),
      description: (
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.cancelledDescription"
            defaultMessage="Cancelled on {date}"
            values={{
              date: formattedTime(action.cancellationTime),
            }}
          />
        </EuiText>
      ),
    },
    EXPIRED: {
      icon: <EuiIcon size="m" type="warning" color="grey" />,
      titleColor: 'grey',
      title: (
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.expiredTitle"
            defaultMessage="Agent {expiredText} expired"
            values={{
              expiredText: getAction(action.type).cancelledText,
            }}
          />
        </EuiText>
      ),
      description: (
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.fleet.agentActivityFlyout.expiredDescription"
            defaultMessage="Expired on {date}"
            values={{
              date: formattedTime(action.expiration),
            }}
          />
        </EuiText>
      ),
    },
  };

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>{displayByStatus[action.status].icon}</EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                color={displayByStatus[action.status].titleColor}
                data-test-subj="statusTitle"
              >
                {displayByStatus[action.status].title}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" data-test-subj="statusDescription">
            {displayByStatus[action.status].description}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {action.status === 'FAILED' && action.latestErrors && action.latestErrors.length > 0 ? (
            <ViewErrors action={action} />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <ViewAgentsButton action={action} onClickViewAgents={onClickViewAgents} />
    </EuiPanel>
  );
};
