/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlyoutFooter,
} from '@elastic/eui';
import styled from 'styled-components';

import type { ActionStatus } from '../../../../../types';
import { useActionStatus } from '../../hooks';
import {
  useGetAgentPolicies,
  useStartServices,
  sendPostRetrieveAgentsByActions,
} from '../../../../../hooks';
import { SO_SEARCH_LIMIT } from '../../../../../constants';

import { Loading } from '../../../components';

import { getKuery } from '../../utils/get_kuery';

import { AGENT_STATUSES } from '../../../services/agent_status';

import { getTodayActions, getOtherDaysActions } from '../agent_activity_helper';

import { ActivitySection } from './activity_section';
import { JumpToDate } from './jump_to_date';

const FullHeightFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

const ButtonsFlexGroup = styled(EuiFlexGroup)`
  padding-left: 24px;
`;

const FlyoutFooterWPadding = styled(EuiFlyoutFooter)`
  padding: 16px 24px !important;
`;

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

  const defaultNActions = 20;
  const [nActions, setNActions] = useState(defaultNActions);
  const [dateFilter, setDateFilter] = useState<moment.Moment | null>(null);
  const { currentActions, abortUpgrade, isFirstLoading } = useActionStatus(
    onAbortSuccess,
    refreshAgentActivity,
    nActions,
    dateFilter
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

  const onChangeDateFilter = (date: moment.Moment | null) => {
    setDateFilter(date);
    setNActions(defaultNActions);
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
            <ButtonsFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="m"
                  onClick={() => setNActions(nActions + 10)}
                  flush="left"
                  data-test-subj="agentActivityFlyout.showMoreButton"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.showMoreButton"
                    defaultMessage="Show more"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <JumpToDate selectedDate={dateFilter} onChangeSelectedDate={onChangeDateFilter} />
              </EuiFlexItem>
              {dateFilter && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="m"
                    onClick={() => onChangeDateFilter(null)}
                    flush="left"
                    data-test-subj="agentActivityFlyout.clearDateFilterButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentActivityFlyout.clearDateFilterButton"
                      defaultMessage="Clear date filter"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </ButtonsFlexGroup>
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
