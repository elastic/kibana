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
} from '@elastic/eui';

import type { ActionStatus } from '../../../../types';
import { useActionStatus } from '../hooks';
import { useStartServices } from '../../../../hooks';

export const AgentActivityFlyout: React.FunctionComponent<{ onClose: () => {} }> = ({
  onClose,
}) => {
  const { currentActions, abortUpgrade } = useActionStatus(() => {}); // TODO refresh agent list

  const inProgressActions = currentActions.filter((a) => a.status === 'in progress');

  const completedActions = currentActions.filter((a) => a.status !== 'in progress');

  return (
    <>
      <EuiFlyout data-test-subj="agentActivityFlyout" onClose={onClose} size="m" paddingSize="none">
        <EuiFlyoutHeader aria-labelledby="FleetAgentActivityFlyoutTitle">
          <EuiPanel borderRadius="none">
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

        <EuiFlyoutBody>
          <ActivitySection
            title="In progress"
            actions={inProgressActions}
            abortUpgrade={abortUpgrade}
          />
          <ActivitySection title="Today" actions={completedActions} abortUpgrade={abortUpgrade} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};

const ActivitySection: React.FunctionComponent<{
  title: string;
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
        currentAction.type === 'UPGRADE' && currentAction.status === 'in progress' ? (
          <UpgradeInProgressActivityItem action={currentAction} abortUpgrade={abortUpgrade} />
        ) : (
          <ActivityItem action={currentAction} />
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
  CANCEL: { inProgressText: 'Cancelling', completedText: 'cancelled', cancelledText: '' },
  ACTION: { inProgressText: 'Actioning', completedText: 'actioned', cancelledText: 'action' },
};

const inProgressTitleColor = '#0077CC';

const ActivityItem: React.FunctionComponent<{ action: ActionStatus }> = ({ action }) => {
  const completeTitle = (
    <EuiText>{`${
      action.nbAgentsAck === action.nbAgentsActioned
        ? action.nbAgentsAck
        : action.nbAgentsAck + ' of ' + action.nbAgentsActioned
    } agents ${actionNames[action.type ?? 'ACTION'].completedText}`}</EuiText>
  );

  const displayByStatus: {
    [key: string]: {
      icon: ReactNode;
      title: ReactNode;
      titleColor: string;
      description: ReactNode | null;
    };
  } = {
    'in progress': {
      icon: <EuiLoadingSpinner size="m" />,
      title: (
        <EuiText>{`${actionNames[action.type ?? 'ACTION'].inProgressText} ${
          action.nbAgentsActioned
        } agents `}</EuiText>
      ),
      titleColor: inProgressTitleColor,
      description: null,
    },
    complete: {
      icon: <EuiIcon size="m" type="checkInCircleFilled" color="green" />,
      title: completeTitle,
      titleColor: 'green',
      description:
        action.type === 'POLICY_REASSIGN' ? (
          <EuiText color="subdued">
            Assigned to Agent policy 1. <br />
            Completed
          </EuiText>
        ) : (
          <EuiText color="subdued">Completed</EuiText>
        ),
    },
    failed: {
      icon: <EuiIcon size="m" type="alert" color="red" />,
      title: completeTitle,
      titleColor: 'red',
      description: <EuiText color="subdued">A problem occured during this operation.</EuiText>,
    },
    cancelled: {
      icon: <EuiIcon size="m" type="alert" color="grey" />,
      titleColor: 'grey',
      title: (
        <EuiText>{`Agent ${actionNames[action.type ?? 'ACTION'].cancelledText} cancelled`}</EuiText>
      ),
      description: <EuiText color="subdued">Cancelled on</EuiText>,
    },
    expired: {
      icon: <EuiIcon size="m" type="alert" color="grey" />,
      titleColor: 'grey',
      title: (
        <EuiText>{`Agent ${actionNames[action.type ?? 'ACTION'].cancelledText} expired`}</EuiText>
      ),
      description: <EuiText color="subdued">Expired on</EuiText>,
    },
  };

  return (
    <EuiPanel hasBorder={true} borderRadius="none">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>{displayByStatus[action.status].icon}</EuiFlexItem>
            <EuiFlexItem>
              <EuiText color={displayByStatus[action.status].titleColor}>
                {displayByStatus[action.status].title}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued">{displayByStatus[action.status].description}</EuiText>
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
              {isScheduled ? <EuiIcon type="iInCircle" /> : <EuiLoadingSpinner size="m" />}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color={inProgressTitleColor}>
                {isScheduled && action.startTime ? (
                  <FormattedMessage
                    id="xpack.fleet.currentUpgrade.scheduleCalloutTitle"
                    defaultMessage="{nbAgents} agents scheduled to upgrade to version {version}"
                    values={{
                      nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
                      version: action.version,
                      date: (
                        <>
                          <FormattedDate
                            value={action.startTime}
                            year="numeric"
                            month="short"
                            day="2-digit"
                          />
                          &nbsp;
                          <FormattedTime value={action.startTime} />
                        </>
                      ),
                    }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.currentUpgrade.calloutTitle"
                    defaultMessage="Upgrading {nbAgents, plural, one {# agent} other {# agents}} to version {version}"
                    values={{
                      nbAgents: action.nbAgentsActioned - action.nbAgentsAck,
                      version: action.version,
                    }}
                  />
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" alignItems="flexStart">
            <EuiFlexItem>
              <EuiText color="subdued">
                {isScheduled && action.startTime ? (
                  <>
                    Scheduled for{' '}
                    <b>
                      <FormattedDate
                        value={action.startTime}
                        year="numeric"
                        month="short"
                        day="2-digit"
                      />
                      &nbsp;
                      <FormattedTime value={action.startTime} />
                    </b>
                    .<br />
                  </>
                ) : null}
                {'Agents may also be configured to upgrade automatically. '}
                <FormattedMessage
                  id="xpack.fleet.currentUpgrade.calloutDescription"
                  defaultMessage="{guideLink}."
                  values={{
                    guideLink: (
                      <EuiLink
                        href={docLinks.links.fleet.upgradeElasticAgent}
                        target="_blank"
                        external
                      >
                        <FormattedMessage
                          id="xpack.fleet.currentUpgrade.guideLink"
                          defaultMessage="Learn more."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={onClickAbortUpgrade}
                isLoading={isAborting}
                data-test-subj="currentBulkUpgrade.sbortBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.currentUpgrade.abortUpgradeButtom"
                  defaultMessage="Abort upgrade"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
