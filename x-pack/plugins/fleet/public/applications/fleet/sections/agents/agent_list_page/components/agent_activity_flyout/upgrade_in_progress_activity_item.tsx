/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiIcon,
  EuiText,
  EuiPanel,
  EuiButton,
  EuiLink,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';
import { useStartServices } from '../../../../../hooks';

import {
  formattedTime,
  inProgressDescription,
  inProgressTitle,
  inProgressTitleColor,
} from './helpers';
import { ViewAgentsButton } from './view_agents_button';

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
