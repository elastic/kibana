/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import {
  EuiSpacer,
  EuiButtonEmpty,
  EuiTitle,
  EuiPanel,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmptyProps,
  EuiLinkProps,
} from '@elastic/eui';
import sharedSourcesIcon from '../shared/assets/share_circle.svg';
import { useRoutes } from '../shared/use_routes';
import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';
import { ORG_SOURCES_PATH, USERS_PATH, ORG_SETTINGS_PATH } from '../../routes';

import { ContentSection } from '../shared/content_section';

import { IAppServerData } from './overview';

import { OnboardingCard } from './onboarding_card';

export const OnboardingSteps: React.FC<IAppServerData> = ({
  hasUsers,
  hasOrgSources,
  canCreateContentSources,
  canCreateInvitations,
  sourcesCount,
  fpAccount: { isCurated },
  organization: { name, defaultOrgName },
  isFederatedAuth,
}) => {
  const { http } = useContext(KibanaContext) as IKibanaContext;
  const { getWSRoute } = useRoutes();
  const accountsPath =
    !isFederatedAuth && (canCreateInvitations || isCurated) ? USERS_PATH : undefined;

  const sourcesPath = canCreateContentSources || isCurated ? ORG_SOURCES_PATH : undefined;
  const onClick = () =>
    sendTelemetry({
      http,
      product: 'workplace_search',
      action: 'clicked',
      metric: 'org_name_change_button',
    });

  const buttonProps = {
    onClick,
    target: '_blank',
    color: 'primary',
    href: getWSRoute(ORG_SETTINGS_PATH),
    'data-test-subj': 'orgNameChangeButton',
  } as EuiButtonEmptyProps & EuiLinkProps;

  return (
    <ContentSection>
      <EuiFlexGrid gutterSize="l" columns={isFederatedAuth ? 1 : 2} responsive={false}>
        <OnboardingCard
          title="Shared sources"
          icon={sharedSourcesIcon}
          description={
            hasOrgSources
              ? `You have added ${sourcesCount} shared ${`source${
                  sourcesCount !== 1 ? 's' : ''
                }`}. Happy searching!`
              : 'Add shared sources for your organization to start searching.'
          }
          actionTitle={`Add${!hasOrgSources ? '' : ' more'} sources`}
          actionPath={sourcesPath}
          complete={hasOrgSources}
        />
        {!isFederatedAuth && (
          <OnboardingCard
            title="Users &amp; invitations"
            icon="user"
            description={
              hasUsers
                ? "Nice, you've invited colleagues to search with you."
                : 'Invite your colleagues into this organization to search with you.'
            }
            actionTitle={`Invite${!hasUsers ? '' : ' more'} users`}
            actionPath={accountsPath}
            complete={hasUsers}
          />
        )}
      </EuiFlexGrid>
      {name === defaultOrgName && (
        <>
          <EuiSpacer />
          <EuiPanel className="euiPanel--inset" paddingSize="l">
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="training" color="subdued" size="xl" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    Before inviting your colleagues, name your organization to improve recognition.
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty {...buttonProps}>Name your organization</EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </>
      )}
    </ContentSection>
  );
};
