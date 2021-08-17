/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import sharedSourcesIcon from '../../components/shared/assets/source_icons/share_circle.svg';
import { ContentSection } from '../../components/shared/content_section';
import { ADD_SOURCE_PATH, USERS_AND_ROLES_PATH, ORG_SETTINGS_PATH } from '../../routes';

import { OnboardingCard } from './onboarding_card';
import { OverviewLogic } from './overview_logic';

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

export const OnboardingSteps: React.FC = () => {
  const {
    organization: { name, defaultOrgName },
  } = useValues(AppLogic);

  const { hasUsers, hasOrgSources, accountsCount, sourcesCount } = useValues(OverviewLogic);

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
      <EuiFlexGrid columns={2}>
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
          actionPath={ADD_SOURCE_PATH}
          complete={hasOrgSources}
        />
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
          actionPath={USERS_AND_ROLES_PATH}
          complete={hasUsers}
        />
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
  const { sendWorkplaceSearchTelemetry } = useActions(TelemetryLogic);

  const onClick = () =>
    sendWorkplaceSearchTelemetry({
      action: 'clicked',
      metric: 'org_name_change_button',
    });

  return (
    <EuiPanel color="subdued" hasShadow={false} paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem className="eui-hideFor--xs eui-hideFor--s" grow={false}>
          <EuiIcon type="documentEdit" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.description"
                defaultMessage="Before inviting your colleagues, name your organization to improve recognition."
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonTo
            to={ORG_SETTINGS_PATH}
            onClick={onClick}
            data-test-subj="orgNameChangeButton"
            size="s"
          >
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.orgNameOnboarding.buttonLabel"
              defaultMessage="Name your organization"
            />
          </EuiButtonTo>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
