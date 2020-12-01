/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove EuiPage & EuiPageBody before exposing full app

import React, { useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActions, useValues } from 'kea';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';

import { AppLogic } from '../../app_logic';
import { OverviewLogic } from './overview_logic';

import { Loading } from '../../../shared/loading';
import { ProductButton } from '../../components/shared/product_button';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { OnboardingSteps } from './onboarding_steps';
import { OrganizationStats } from './organization_stats';
import { RecentActivity } from './recent_activity';

const ONBOARDING_HEADER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingHeader.title',
  { defaultMessage: 'Get started with Workplace Search' }
);

const HEADER_TITLE = i18n.translate('xpack.enterpriseSearch.workplaceSearch.overviewHeader.title', {
  defaultMessage: 'Organization overview',
});

const ONBOARDING_HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewOnboardingHeader.description',
  { defaultMessage: 'Complete the following to set up your organization.' }
);

const HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.overviewHeader.description',
  { defaultMessage: "Your organizations's statistics and activity" }
);

export const Overview: React.FC = () => {
  const {
    organization: { name: orgName, defaultOrgName },
  } = useValues(AppLogic);

  const { initializeOverview } = useActions(OverviewLogic);
  const { dataLoading, hasUsers, hasOrgSources, isOldAccount } = useValues(OverviewLogic);

  useEffect(() => {
    initializeOverview();
  }, [initializeOverview]);

  // TODO: Remove div wrapper once the Overview page is using the full Layout
  if (dataLoading) {
    return (
      <div style={{ height: '90vh' }}>
        <Loading />
      </div>
    );
  }

  const hideOnboarding = hasUsers && hasOrgSources && isOldAccount && orgName !== defaultOrgName;

  const headerTitle = hideOnboarding ? HEADER_TITLE : ONBOARDING_HEADER_TITLE;
  const headerDescription = hideOnboarding ? HEADER_DESCRIPTION : ONBOARDING_HEADER_DESCRIPTION;

  return (
    <EuiPage restrictWidth>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />

      <EuiPageBody>
        <ViewContentHeader
          title={headerTitle}
          description={headerDescription}
          action={<ProductButton />}
        />
        {!hideOnboarding && <OnboardingSteps />}
        <EuiSpacer size="xl" />
        <OrganizationStats />
        <EuiSpacer size="xl" />
        <RecentActivity />
      </EuiPageBody>
    </EuiPage>
  );
};
