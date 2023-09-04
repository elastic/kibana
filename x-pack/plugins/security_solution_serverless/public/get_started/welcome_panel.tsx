/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import React from 'react';
import progress from './images/progress.svg';
import invite from './images/invite.svg';
import type { HeaderSection } from './types';
import {
  WELCOME_PANEL_PROJECT_CREATED_TITLE,
  WELCOME_PANEL_PROJECT_CREATED_DESCRIPTION,
  WELCOME_PANEL_INVITE_YOUR_TEAM_TITLE,
  WELCOME_PANEL_INVITE_YOUR_TEAM_DESCRIPTION,
  WELCOME_PANEL_PROGRESS_TRACKER_TITLE,
} from './translations';
import { ProgressTracker } from './progress_tracker';

const headerCards: HeaderSection[] = [
  {
    icon: { type: 'checkInCircleFilled', color: '#00BFB3' },
    title: WELCOME_PANEL_PROJECT_CREATED_TITLE,
    description: () => WELCOME_PANEL_PROJECT_CREATED_DESCRIPTION,
    id: 'projectCreated',
  },
  {
    icon: { type: invite },
    title: WELCOME_PANEL_INVITE_YOUR_TEAM_TITLE,
    description: () => WELCOME_PANEL_INVITE_YOUR_TEAM_DESCRIPTION,
    id: 'inviteYourTeam',
  },
  {
    icon: { type: progress },
    title: WELCOME_PANEL_PROGRESS_TRACKER_TITLE,
    id: 'progressTracker',
    description: ({
      totalActiveSteps,
      totalStepsLeft,
    }: {
      totalActiveSteps?: number | null;
      totalStepsLeft?: number | null;
    }) => <ProgressTracker totalActiveSteps={totalActiveSteps} totalStepsLeft={totalStepsLeft} />,
  },
];

const WelcomePanelComponent = ({
  totalActiveSteps,
  totalStepsLeft,
}: {
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      css={css`
        gap: ${euiTheme.size.xl};
      `}
    >
      {headerCards.map((item, index) => {
        return (
          <EuiFlexItem key={`set-up-card-${index}`}>
            <EuiCard
              layout="horizontal"
              icon={
                item.icon ? (
                  <EuiIcon size="xxl" {...item.icon} data-test-subj={`${item.id}Icon`} />
                ) : undefined
              }
              title={
                <EuiTitle
                  size="s"
                  css={css`
                    font-size: 19px;
                  `}
                >
                  <span>{item.title}</span>
                </EuiTitle>
              }
              description={
                <span
                  css={css`
                    color: ${euiTheme.colors.mediumShade};
                  `}
                >
                  {item?.description?.({ totalActiveSteps, totalStepsLeft })}
                </span>
              }
              hasBorder
              paddingSize="l"
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

export const WelcomePanel = React.memo(WelcomePanelComponent);
