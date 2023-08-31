/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import progress from '../images/progress.svg';
import invite from '../images/invite.svg';
import type { HeaderSection } from './types';
import {
  WELCOME_PANEL_PROJECT_CREATED_TITLE,
  WELCOME_PANEL_INVITE_YOUR_TEAM_TITLE,
  WELCOME_PANEL_INVITE_YOUR_TEAM_DESCRIPTION,
  WELCOME_PANEL_PROGRESS_TRACKER_TITLE,
} from './translations';
import { ProgressTracker } from './progress_tracker';
import { useKibana } from '../../common/services';
import { getCloudUrl } from '../../navigation/links/util';
import type { ProductTier } from '../../../common/product';
import { ChangePlanLink } from './change_plan_link';
import { Spacer } from './spacer';

export const useWelcomePanel = ({
  productTier,
  totalActiveSteps,
  totalStepsLeft,
}: {
  productTier: ProductTier | undefined;
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}): HeaderSection[] => {
  const { cloud } = useKibana().services;

  const welcomePanel: HeaderSection[] = useMemo(
    () => [
      {
        icon: { type: 'checkInCircleFilled', color: '#00BFB3' },
        title: WELCOME_PANEL_PROJECT_CREATED_TITLE,
        description: (
          <FormattedMessage
            id="xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.descriptionWithLink"
            defaultMessage="View all projects {link}."
            values={{
              link: (
                <EuiLink href={getCloudUrl('projects', cloud)}>
                  <FormattedMessage
                    id="xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.description.link"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />
        ),
        id: 'projectCreated',
        footer: <ChangePlanLink productTier={productTier} />,
      },
      {
        icon: { type: invite },
        title: WELCOME_PANEL_INVITE_YOUR_TEAM_TITLE,
        description: <>{WELCOME_PANEL_INVITE_YOUR_TEAM_DESCRIPTION}</>,
        id: 'inviteYourTeam',
        footer: (
          <>
            <Spacer />
            <EuiFlexGroup justifyContent="flexStart" component="span">
              <EuiFlexItem grow={false} component="span">
                <EuiButton
                  iconType="plusInCircle"
                  href={getCloudUrl('organization', cloud)}
                  size="s"
                >
                  <FormattedMessage
                    id="xpack.securitySolutionServerless.getStarted.welcomePanel.inviteYourTeam.button.title"
                    defaultMessage="Add teammates"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ),
      },
      {
        icon: { type: progress },
        title: WELCOME_PANEL_PROGRESS_TRACKER_TITLE,
        id: 'progressTracker',
        description: (
          <ProgressTracker totalActiveSteps={totalActiveSteps} totalStepsLeft={totalStepsLeft} />
        ),
      },
    ],
    [cloud, productTier, totalActiveSteps, totalStepsLeft]
  );

  return welcomePanel;
};
