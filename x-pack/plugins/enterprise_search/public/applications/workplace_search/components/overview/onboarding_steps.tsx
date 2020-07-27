/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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

const SOURCES_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingSourcesCard.title',
  { defaultMessage: 'Shared sources' }
);

const USERS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.title',
  { defaultMessage: 'Users & invitations' }
);

const ONBOARDING_SOURCES_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingSourcesCard.description',
  { defaultMessage: 'Add shared sources for your organization to start searching.' }
);

const USERS_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewUsersCard.title',
  { defaultMessage: 'Nice, you’ve invited colleagues to search with you.' }
);

const ONBOARDING_USERS_CARD_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingUsersCard.description',
  { defaultMessage: 'Invite your colleagues into this organization to search with you.' }
);

export const OnboardingSteps: React.FC<IAppServerData> = ({
  hasUsers,
  hasOrgSources,
  canCreateContentSources,
  canCreateInvitations,
  accountsCount,
  sourcesCount,
  fpAccount: { isCurated },
  organization: { name, defaultOrgName },
  isFederatedAuth,
}) => {
  const accountsPath =
    !isFederatedAuth && (canCreateInvitations || isCurated) ? USERS_PATH : undefined;
  const sourcesPath = canCreateContentSources || isCurated ? ORG_SOURCES_PATH : undefined;

  const SOURCES_CARD_DESCRIPTION = i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.description',
    {
      defaultMessage:
        'You have added {sourcesCount, number} shared {sourcesCount, plural, one {source} other {sources}}. Happy searching.',
      values: { sourcesCount },
    }
  );

  return (
    <ContentSection>
      <EuiFlexGrid columns={isFederatedAuth ? 1 : 2}>
        <OnboardingCard
          title={SOURCES_TITLE}
          testSubj="sharedSourcesButton"
          icon={sharedSourcesIcon}
          description={
            hasOrgSources ? SOURCES_CARD_DESCRIPTION : ONBOARDING_SOURCES_CARD_DESCRIPTION
          }
          actionTitle={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sourcesOnboardingCard.buttonLabel',
            {
              defaultMessage: 'Add {label} sources',
              values: { label: sourcesCount > 0 ? 'more' : '' },
            }
          )}
          actionPath={sourcesPath}
          complete={hasOrgSources}
        />
        {!isFederatedAuth && (
          <OnboardingCard
            title={USERS_TITLE}
            testSubj="usersButton"
            icon="user"
            description={hasUsers ? USERS_CARD_DESCRIPTION : ONBOARDING_USERS_CARD_DESCRIPTION}
            actionTitle={i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.usersOnboardingCard.buttonLabel',
              {
                defaultMessage: 'Invite {label} users',
                values: { label: accountsCount > 0 ? 'more' : '' },
              }
            )}
            actionPath={accountsPath}
            complete={hasUsers}
          />
        )}
      </EuiFlexGrid>
      {name === defaultOrgName && (
        <>
          <EuiSpacer />
          <OrgNameOnboarding />
        </>
      )}
    </ContentSection>
  );
};

export const OrgNameOnboarding: React.FC = () => {
  const { http } = useContext(KibanaContext) as IKibanaContext;
  const { getWSRoute } = useRoutes();

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
    <EuiPanel paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem className="eui-hideFor--xs eui-hideFor--s" grow={false}>
          <EuiIcon type="training" color="subdued" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.description"
                defaultMessage="Before inviting your colleagues, name your organization to improve recognition."
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty {...buttonProps}>
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.buttonLabel"
              defaultMessage="Name your organization"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
