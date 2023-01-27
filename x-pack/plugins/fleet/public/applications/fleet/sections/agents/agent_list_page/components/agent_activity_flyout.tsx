/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiIcon,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiButton,
  EuiLink,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlyoutFooter,
} from '@elastic/eui';
import styled from 'styled-components';

import type { ActionStatus } from '../../../../types';
import { useActionStatus } from '../hooks';
import { useGetAgentPolicies, useStartServices } from '../../../../hooks';
import { SO_SEARCH_LIMIT } from '../../../../constants';

import { Loading } from '../../components';

import { getTodayActions, getOtherDaysActions } from './agent_activity_helper';

const FullHeightFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

const FlyoutFooterWPadding = styled(EuiFlyoutFooter)`
  padding: 16px 24px !important;
`;

export const AgentActivityFlyout: React.FunctionComponent<{
  onClose: () => void;
  onAbortSuccess: () => void;
  refreshAgentActivity: boolean;
}> = ({ onClose, onAbortSuccess, refreshAgentActivity }) => {
  const { data: agentPoliciesData } = useGetAgentPolicies({
    perPage: SO_SEARCH_LIMIT,
  });

  const { currentActions, abortUpgrade, isFirstLoading } = useActionStatus(
    onAbortSuccess,
    refreshAgentActivity
  );

  const getAgentPolicyName = (policyId: string) => {
    const policy = agentPoliciesData?.items.find((item) => item.id === policyId);
    return policy?.name ?? policyId;
  };

  const currentActionsEnriched = currentActions.map((a) => ({
    ...a,
    newPolicyId: getAgentPolicyName(a.newPolicyId ?? ''),
  }));

  const inProgressActions = currentActionsEnriched.filter((a) => a.status === 'IN_PROGRESS');

  const completedActions = currentActionsEnriched.filter((a) => a.status !== 'IN_PROGRESS');

  const todayActions = getTodayActions(completedActions);
  const otherDays = getOtherDaysActions(completedActions);

  return (
    <>
      <EuiFlyout data-test-subj="agentActivityFlyout" onClose={onClose} size="m" paddingSize="none">
        <EuiFlyoutHeader aria-labelledby="FleetAgentActivityFlyoutTitle">
          <EuiPanel borderRadius="none" hasShadow={false} hasBorder={true}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.title"
                      defaultMessage="Agent activity"
                    />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.activityLogText"
                      defaultMessage="Activity log of Elastic Agent operations will appear here."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlyoutHeader>

        <FullHeightFlyoutBody>
          {isFirstLoading ? (
            <EuiFlexGroup
              direction="row"
              justifyContent={'center'}
              alignItems={'center'}
              className="eui-fullHeight"
            >
              <EuiFlexItem>
                <Loading />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : currentActionsEnriched.length === 0 ? (
            <EuiFlexGroup
              direction="column"
              justifyContent={'center'}
              alignItems={'center'}
              className="eui-fullHeight"
            >
              <EuiFlexItem>
                <EuiEmptyPrompt
                  iconType="clock"
                  iconColor="default"
                  title={
                    <h2>
                      {' '}
                      <FormattedMessage
                        id="xpack.fleet.agentActivityFlyout.noActivityText"
                        defaultMessage="No activity to display"
                      />
                    </h2>
                  }
                  titleSize="m"
                  body={
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.noActivityDescription"
                      defaultMessage="Activity feed will appear here as agents are reassigned, upgraded, or unenrolled."
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {inProgressActions.length > 0 ? (
            <ActivitySection
              title={
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.inProgressTitle"
                  defaultMessage="In progress"
                />
              }
              actions={inProgressActions}
              abortUpgrade={abortUpgrade}
            />
          ) : null}
          {todayActions.length > 0 ? (
            <ActivitySection
              title={
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.todayTitle"
                  defaultMessage="Today"
                />
              }
              actions={todayActions}
              abortUpgrade={abortUpgrade}
            />
          ) : null}
          {Object.keys(otherDays).map((day) => (
            <ActivitySection
              key={day}
              title={<FormattedDate value={day} year="numeric" month="short" day="2-digit" />}
              actions={otherDays[day]}
              abortUpgrade={abortUpgrade}
            />
          ))}
        </FullHeightFlyoutBody>
        <FlyoutFooterWPadding>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.closeBtn"
                    defaultMessage="Close"
                  />
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </FlyoutFooterWPadding>
      </EuiFlyout>
    </>
  );
};

const ActivitySection: React.FunctionComponent<{
  title: ReactNode;
  actions: ActionStatus[];
  abortUpgrade: (action: ActionStatus) => Promise<void>;
}> = ({ title, actions, abortUpgrade }) => {
  return (
    <>
      <EuiPanel color="subdued" hasBorder={true} borderRadius="none">
        <EuiText>
          <b>{title}</b>
        </EuiText>
      </EuiPanel>
      {actions.map((currentAction) =>
        currentAction.type === 'UPGRADE' && currentAction.status === 'IN_PROGRESS' ? (
          <UpgradeInProgressActivityItem
            action={currentAction}
            abortUpgrade={abortUpgrade}
            key={currentAction.actionId}
          />
        ) : (
          <ActivityItem action={currentAction} key={currentAction.actionId} />
        )
      )}
    </>
  );
};

const actionNames: {
  [key: string]: { inProgressText: string; completedText: string; cancelledText: string };
} = {
  POLICY_REASSIGN: {
    inProgressText: 'Reassigning',
    completedText: 'assigned to a new policy',
    cancelledText: 'assignment',
  },
  UPGRADE: { inProgressText: 'Upgrading', completedText: 'upgraded', cancelledText: 'upgrade' },
  UNENROLL: {
    inProgressText: 'Unenrolling',
    completedText: 'unenrolled',
    cancelledText: 'unenrollment',
  },
  FORCE_UNENROLL: {
    inProgressText: 'Force unenrolling',
    completedText: 'force unenrolled',
    cancelledText: 'force unenrollment',
  },
  UPDATE_TAGS: {
    inProgressText: 'Updating tags of',
    completedText: 'updated tags',
    cancelledText: 'update tags',
  },
  CANCEL: { inProgressText: 'Cancelling', completedText: 'cancelled', cancelledText: '' },
  REQUEST_DIAGNOSTICS: {
    inProgressText: 'Requesting diagnostics for',
    completedText: 'requested diagnostics',
    cancelledText: 'request diagnostics',
  },
  SETTINGS: {
    inProgressText: 'Updating settings of',
    completedText: 'updated settings',
    cancelledText: 'update settings',
  },
  POLICY_CHANGE: {
    inProgressText: 'Changing policy of',
    completedText: 'changed policy',
    cancelledText: 'change policy',
  },
  INPUT_ACTION: {
    inProgressText: 'Input action in progress of',
    completedText: 'input action completed',
    cancelledText: 'input action',
  },
  ACTION: { inProgressText: 'Actioning', completedText: 'actioned', cancelledText: 'action' },
};

const getAction = (type?: string) => actionNames[type ?? 'ACTION'] ?? actionNames.ACTION;

const inProgressTitleColor = '#0077CC';

const formattedTime = (time?: string) => {
  return time ? (
    <>
      <FormattedDate value={time} year="numeric" month="short" day="2-digit" />
      &nbsp;
      <FormattedTime value={time} />
    </>
  ) : null;
};

const inProgressTitle = (action: ActionStatus) => (
  <FormattedMessage
    id="xpack.fleet.agentActivity.inProgressTitle"
    defaultMessage="{inProgressText} {nbAgents} {agents} {reassignText}{upgradeText}"
    values={{
      nbAgents:
        action.nbAgentsAck >= action.nbAgentsActioned
          ? action.nbAgentsAck
          : action.nbAgentsAck === 0
          ? action.nbAgentsActioned
          : action.nbAgentsActioned - action.nbAgentsAck + ' of ' + action.nbAgentsActioned,
      agents: action.nbAgentsActioned === 1 ? 'agent' : 'agents',
      inProgressText: getAction(action.type).inProgressText,
      reassignText:
        action.type === 'POLICY_REASSIGN' && action.newPolicyId ? `to ${action.newPolicyId}` : '',
      upgradeText: action.type === 'UPGRADE' ? `to version ${action.version}` : '',
    }}
  />
);

const inProgressDescription = (time?: string) => (
  <FormattedMessage
    id="xpack.fleet.agentActivityFlyout.startedDescription"
    defaultMessage="Started on {date}."
    values={{
      date: formattedTime(time),
    }}
  />
);

const ActivityItem: React.FunctionComponent<{ action: ActionStatus }> = ({ action }) => {
  const completeTitle = (
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
          <EuiIcon size="m" type="alert" color="red" />
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
        ) : (
          <EuiText color="subdued">{completedDescription}</EuiText>
        ),
    },
    FAILED: {
      icon: <EuiIcon size="m" type="alert" color="red" />,
      title: completeTitle,
      titleColor: 'red',
      description: failedDescription,
    },
    CANCELLED: {
      icon: <EuiIcon size="m" type="alert" color="grey" />,
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
      icon: <EuiIcon size="m" type="alert" color="grey" />,
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
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const UpgradeInProgressActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  abortUpgrade: (action: ActionStatus) => Promise<void>;
}> = ({ action, abortUpgrade }) => {
  const { docLinks } = useStartServices();
  const [isAborting, setIsAborting] = useState(false);
  const onClickAbortUpgrade = useCallback(async () => {
    try {
      setIsAborting(true);
      await abortUpgrade(action);
    } finally {
      setIsAborting(false);
    }
  }, [action, abortUpgrade]);

  const isScheduled = useMemo(() => {
    if (!action.startTime) {
      return false;
    }
    const now = Date.now();
    const startDate = new Date(action.startTime).getTime();

    return startDate > now;
  }, [action]);

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              {isScheduled ? <EuiIcon type="clock" /> : <EuiLoadingSpinner size="m" />}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color={inProgressTitleColor} data-test-subj="upgradeInProgressTitle">
                {isScheduled && action.startTime ? (
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.scheduleTitle"
                    defaultMessage="{nbAgents} agents scheduled to upgrade to version {version}"
                    values={{
                      nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
                      version: action.version,
                    }}
                  />
                ) : (
                  inProgressTitle(action)
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" alignItems="flexStart">
            <EuiFlexItem>
              <EuiText color="subdued" data-test-subj="upgradeInProgressDescription">
                <p>
                  {isScheduled && action.startTime ? (
                    <>
                      <FormattedMessage
                        id="xpack.fleet.agentActivityFlyout.scheduledDescription"
                        defaultMessage="Scheduled for "
                      />
                      <strong>{formattedTime(action.startTime)}</strong>.&nbsp;
                    </>
                  ) : (
                    <>{inProgressDescription(action.creationTime)}&nbsp;</>
                  )}
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.upgradeDescription"
                    defaultMessage="{guideLink} about agent upgrades."
                    values={{
                      guideLink: (
                        <EuiLink href={docLinks.links.fleet.upgradeElasticAgent} target="_blank">
                          <FormattedMessage
                            id="xpack.fleet.agentActivityFlyout.guideLink"
                            defaultMessage="Learn more"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={onClickAbortUpgrade}
                isLoading={isAborting}
                data-test-subj="abortBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.agentActivityFlyout.abortUpgradeButtom"
                  defaultMessage="Cancel"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
