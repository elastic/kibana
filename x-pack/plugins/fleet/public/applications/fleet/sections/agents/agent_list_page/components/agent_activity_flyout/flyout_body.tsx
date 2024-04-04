/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
} from '@elastic/eui';
import styled from 'styled-components';

import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';

import { Loading } from '../../../components';

import { ActivitySection } from './activity_section';
import { GoToDate } from './go_to_date';

import { getTodayActions, getOtherDaysActions } from './agent_activity_helper';

const FullHeightFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

const ButtonsFlexGroup = styled(EuiFlexGroup)`
  padding-left: 24px;
`;

export const FlyoutBody: React.FunctionComponent<{
  isFirstLoading: boolean;
  currentActions: ActionStatus[];
  abortUpgrade: (action: ActionStatus) => Promise<void>;
  onClickViewAgents: (action: ActionStatus) => Promise<void>;
  areActionsFullyLoaded: boolean;
  onClickShowMore: () => void;
  dateFilter: moment.Moment | null;
  onChangeDateFilter: (date: moment.Moment | null) => void;
}> = ({
  isFirstLoading,
  currentActions,
  abortUpgrade,
  onClickViewAgents,
  areActionsFullyLoaded,
  onClickShowMore,
  dateFilter,
  onChangeDateFilter,
}) => {
  // Loading
  if (isFirstLoading) {
    return (
      <FullHeightFlyoutBody>
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
      </FullHeightFlyoutBody>
    );
  }

  // No actions
  if (currentActions.length === 0) {
    return (
      <FullHeightFlyoutBody>
        <EuiFlexGroup
          direction="column"
          justifyContent={'center'}
          alignItems={'center'}
          className="eui-fullHeight"
        >
          <EuiFlexItem grow={false}>
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
          <EuiFlexItem grow={false}>
            <GoToDate
              selectedDate={dateFilter}
              onChangeSelectedDate={onChangeDateFilter}
              filledStyle={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onChangeDateFilter(null)}>
              <FormattedMessage
                id="xpack.fleet.agentActivityFlyout.emptyState.showMoreButton"
                defaultMessage="Clear selected date"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </FullHeightFlyoutBody>
    );
  }

  // Loaded actions
  const inProgressActions = currentActions.filter((a) => a.status === 'IN_PROGRESS');
  const completedActions = currentActions.filter((a) => a.status !== 'IN_PROGRESS');
  const todayActions = getTodayActions(completedActions);
  const otherDays = getOtherDaysActions(completedActions);

  return (
    <FullHeightFlyoutBody>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="column">
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
        </EuiFlexItem>
        <EuiFlexItem>
          <ButtonsFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="m"
                onClick={onClickShowMore}
                disabled={areActionsFullyLoaded}
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
              <GoToDate
                selectedDate={dateFilter}
                onChangeSelectedDate={onChangeDateFilter}
                filledStyle={false}
              />
            </EuiFlexItem>
            {dateFilter && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="m"
                  onClick={() => onChangeDateFilter(null)}
                  flush="left"
                  data-test-subj="agentActivityFlyout.clearSelectedDateButton"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentActivityFlyout.clearSelectedDateutton"
                    defaultMessage="Clear selected date"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </ButtonsFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FullHeightFlyoutBody>
  );
};
