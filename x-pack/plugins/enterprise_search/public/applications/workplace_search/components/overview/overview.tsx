/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SetWorkplaceSearchBreadcrumbs as SetBreadcrumbs } from '../../../shared/kibana_breadcrumbs';
import { SendWorkplaceSearchTelemetry as SendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

import { IAccount } from '../../types';

import { ErrorState } from '../error_state';

import { Loading } from '../shared/loading';
import { ProductButton } from '../shared/product_button';
import { ViewContentHeader } from '../shared/view_content_header';

import { OnboardingSteps } from './onboarding_steps';
import { OrganizationStats } from './organization_stats';
import { RecentActivity, IFeedActivity } from './recent_activity';

export interface IAppServerData {
  hasUsers: boolean;
  hasOrgSources: boolean;
  canCreateContentSources: boolean;
  canCreateInvitations: boolean;
  isOldAccount: boolean;
  sourcesCount: number;
  pendingInvitationsCount: number;
  accountsCount: number;
  personalSourcesCount: number;
  activityFeed: IFeedActivity[];
  organization: {
    name: string;
    defaultOrgName: string;
  };
  isFederatedAuth: boolean;
  currentUser: {
    firstName: string;
    email: string;
    name: string;
    color: string;
  };
  fpAccount: IAccount;
}

export const defaultServerData = {
  accountsCount: 1,
  activityFeed: [],
  canCreateContentSources: true,
  canCreateInvitations: true,
  currentUser: {
    firstName: '',
    email: '',
    name: '',
    color: '',
  },
  fpAccount: {} as IAccount,
  hasOrgSources: false,
  hasUsers: false,
  isFederatedAuth: true,
  isOldAccount: false,
  organization: {
    name: '',
    defaultOrgName: '',
  },
  pendingInvitationsCount: 0,
  personalSourcesCount: 0,
  sourcesCount: 0,
} as IAppServerData;

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
  const { http } = useContext(KibanaContext) as IKibanaContext;

  const [isLoading, setIsLoading] = useState(true);
  const [hasErrorConnecting, setHasErrorConnecting] = useState(false);
  const [appData, setAppData] = useState(defaultServerData);

  const getAppData = async () => {
    try {
      const response = await http.get('/api/workplace_search/overview');
      setAppData(response);
    } catch (error) {
      setHasErrorConnecting(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAppData();
  }, []);

  if (hasErrorConnecting) return <ErrorState />;
  if (isLoading) return <Loading />;

  const {
    hasUsers,
    hasOrgSources,
    isOldAccount,
    organization: { name: orgName, defaultOrgName },
  } = appData as IAppServerData;
  const hideOnboarding = hasUsers && hasOrgSources && isOldAccount && orgName !== defaultOrgName;

  const headerTitle = hideOnboarding ? HEADER_TITLE : ONBOARDING_HEADER_TITLE;
  const headerDescription = hideOnboarding ? HEADER_DESCRIPTION : ONBOARDING_HEADER_DESCRIPTION;

  return (
    <EuiPage restrictWidth>
      <SetBreadcrumbs isRoot />
      <SendTelemetry action="viewed" metric="overview" />

      <EuiPageBody>
        <ViewContentHeader
          title={headerTitle}
          description={headerDescription}
          action={<ProductButton />}
        />
        {!hideOnboarding && <OnboardingSteps {...appData} />}
        <EuiSpacer size="xl" />
        <OrganizationStats {...appData} />
        <EuiSpacer size="xl" />
        <RecentActivity {...appData} />
      </EuiPageBody>
    </EuiPage>
  );
};
