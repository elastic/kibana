/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
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
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';

import type { ActionStatus } from '../../../../types';
import { useActionStatus } from '../hooks';
import {
  useGetAgentPolicies,
  useStartServices,
  sendPostRetrieveAgentsByActions,
} from '../../../../hooks';
import { SO_SEARCH_LIMIT } from '../../../../constants';

import { Loading } from '../../components';

import { getKuery } from '../utils/get_kuery';

import { AGENT_STATUSES } from '../../services/agent_status';

import { getTodayActions, getOtherDaysActions } from './agent_activity_helper';
import { ViewErrors } from './view_errors';

const FullHeightFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

const FlyoutFooterWPadding = styled(EuiFlyoutFooter)`
  padding: 16px 24px !important;
`;

const MAX_VIEW_AGENTS_COUNT = 1000;

export const AgentActivityFlyout: React.FunctionComponent<{
  onClose: () => void;
  onAbortSuccess: () => void;
  refreshAgentActivity: boolean;
  setSearch: (search: string) => void;
  setSelectedStatus: (status: string[]) => void;
}> = ({ onClose, onAbortSuccess, refreshAgentActivity, setSearch, setSelectedStatus }) => {
  const { notifications } = useStartServices();
  const { data: agentPoliciesData } = useGetAgentPolicies({
    perPage: SO_SEARCH_LIMIT,
  });

  const { currentActions, abortUpgrade, isFirstLoading } = useActionStatus(
    onAbortSuccess,
    refreshAgentActivity
  );

  const getAgentPolicyName = useCallback(
    (policyId: string) => {
      const policy = agentPoliciesData?.items.find((item) => item.id === policyId);
      return policy?.name ?? policyId;
    },
    [agentPoliciesData]
  );

  const currentActionsEnriched: ActionStatus[] = useMemo(
    () =>
      currentActions.map((a) => ({
        ...a,
        newPolicyId: getAgentPolicyName(a.newPolicyId ?? ''),
        policyId: getAgentPolicyName(a.policyId ?? ''),
      })),
    [currentActions, getAgentPolicyName]
  );

  const inProgressActions = currentActionsEnriched.filter((a) => a.status === 'IN_PROGRESS');

  const completedActions = currentActionsEnriched.filter((a) => a.status !== 'IN_PROGRESS');

  const todayActions = getTodayActions(completedActions);
  const otherDays = getOtherDaysActions(completedActions);

  const onClickViewAgents = async (action: ActionStatus) => {
    try {
      const { data } = await sendPostRetrieveAgentsByActions({ actionIds: [action.actionId] });
      if (data?.items?.length) {
        const kuery = getKuery({
          selectedAgentIds: data.items,
        });
        setSearch(kuery);
      }
      setSelectedStatus(AGENT_STATUSES);

      onClose();
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.agentActivityFlyout.error', {
          defaultMessage: 'Error viewing selected agents',
        }),
      });
    }
  };

  return (
    <>
      <EuiFlyout
        data-test-subj="agentActivityFlyout"
        onClose={() => {
          // stop polling action status API
          refreshAgentActivity = false;
          onClose();
        }}
        size="m"
        paddingSize="none"
      >
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
          <EuiFlexGroup direction="column" className="eui-fullHeight" css={{ overflowY: 'auto' }}>
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
                onClickViewAgents={onClickViewAgents}
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
                onClickViewAgents={onClickViewAgents}
              />
            ) : null}
            {Object.keys(otherDays).map((day) => (
              <ActivitySection
                key={day}
                title={<FormattedDate value={day} year="numeric" month="short" day="2-digit" />}
                actions={otherDays[day]}
                abortUpgrade={abortUpgrade}
                onClickViewAgents={onClickViewAgents}
              />
            ))}
          </EuiFlexGroup>
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
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ title, actions, abortUpgrade, onClickViewAgents }) => {
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
            onClickViewAgents={onClickViewAgents}
          />
        ) : (
          <ActivityItem
            action={currentAction}
            key={currentAction.actionId}
            onClickViewAgents={onClickViewAgents}
          />
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
    inProgressText: 'Applying policy change on',
    completedText: 'applied policy change',
    cancelledText: 'policy change',
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
    defaultMessage="{inProgressText} {nbAgents} {agents} {reassignText}{upgradeText}{failuresText}"
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
      failuresText: action.nbAgentsFailed > 0 ? `, has ${action.nbAgentsFailed} failure(s)` : '',
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

const ActivityItem: React.FunctionComponent<{
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

export const UpgradeInProgressActivityItem: React.FunctionComponent<{
  action: ActionStatus;
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, abortUpgrade, onClickViewAgents }) => {
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

  const showCancelButton = useMemo(() => {
    return isScheduled || action.hasRolloutPeriod;
  }, [action, isScheduled]);

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
              <ViewAgentsButton action={action} onClickViewAgents={onClickViewAgents} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {showCancelButton ? (
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
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const ViewAgentsButton: React.FunctionComponent<{
  action: ActionStatus;
  onClickViewAgents: (action: ActionStatus) => void;
}> = ({ action, onClickViewAgents }) => {
  if (action.type === 'UPDATE_TAGS') {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      size="m"
      onClick={() => onClickViewAgents(action)}
      flush="left"
      data-test-subj="agentActivityFlyout.viewAgentsButton"
      disabled={action.nbAgentsActionCreated > MAX_VIEW_AGENTS_COUNT}
    >
      <FormattedMessage
        id="xpack.fleet.agentActivityFlyout.viewAgentsButton"
        defaultMessage="View Agents"
      />
    </EuiButtonEmpty>
  );

  if (action.nbAgentsActionCreated <= MAX_VIEW_AGENTS_COUNT) {
    return button;
  }

  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.agentActivityFlyout.viewAgentsButtonDisabledMaxTooltip"
          defaultMessage="The view agents feature is only available for action impacting less then {agentCount} agents"
          values={{
            agentCount: MAX_VIEW_AGENTS_COUNT,
          }}
        />
      }
    >
      {button}
    </EuiToolTip>
  );
};
