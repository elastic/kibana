/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { OnboardingSteps } from './onboarding_steps';
import { OrganizationStats } from './organization_stats';
import { OverviewLogic } from './overview_logic';
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
    <>
      <SetPageChrome />
      <SendTelemetry action="viewed" metric="overview" />

      <ViewContentHeader title={headerTitle} description={headerDescription} />
      {!hideOnboarding && <OnboardingSteps />}
      <EuiSpacer size="xl" />
      <OrganizationStats />
      <EuiSpacer size="xl" />
      <RecentActivity />
    </>
  );
};
