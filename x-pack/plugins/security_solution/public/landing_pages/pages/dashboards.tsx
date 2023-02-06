/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import { SecurityPageName } from '../../app/types';
import { DashboardsTable } from '../../common/components/dashboards/dashboards_table';
import { Title } from '../../common/components/header_page/title';
import { useAppRootNavLink } from '../../common/components/navigation/nav_links';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useCreateSecurityDashboardLink } from '../../common/containers/dashboards/use_create_security_dashboard_link';
import { useCapabilities, useNavigateTo } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { LandingImageCards } from '../components/landing_links_images';
import * as i18n from './translations';

/* eslint-disable @elastic/eui/href-or-on-click */
const Header: React.FC<{ canCreateDashboard: boolean }> = ({ canCreateDashboard }) => {
  const { isLoading, url } = useCreateSecurityDashboardLink();
  const { navigateTo } = useNavigateTo();
  return (
    <EuiFlexGroup gutterSize="none" direction="row">
      <EuiFlexItem>
        <Title title={i18n.DASHBOARDS_PAGE_TITLE} />
      </EuiFlexItem>
      {canCreateDashboard && (
        <EuiFlexItem grow={false}>
          <EuiButton
            isDisabled={isLoading}
            color="primary"
            fill
            iconType="plusInCircle"
            href={url}
            onClick={(ev) => {
              ev.preventDefault();
              navigateTo({ url });
            }}
            data-test-subj="createDashboardButton"
          >
            {i18n.DASHBOARDS_PAGE_CREATE_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const DashboardsLandingPage = () => {
  const dashboardLinks = useAppRootNavLink(SecurityPageName.dashboardsLanding)?.links ?? [];
  const { show: canReadDashboard, createNew: canCreateDashboard } =
    useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);

  return (
    <SecuritySolutionPageWrapper>
      <Header canCreateDashboard={canCreateDashboard} />
      <EuiSpacer size="xl" />

      <EuiTitle size="xxxs">
        <h2>{i18n.DASHBOARDS_PAGE_SECTION_DEFAULT}</h2>
      </EuiTitle>
      <EuiHorizontalRule margin="s" />
      <LandingImageCards items={dashboardLinks} />
      <EuiSpacer size="xxl" />

      {canReadDashboard && (
        <>
          <EuiTitle size="xxxs">
            <h2>{i18n.DASHBOARDS_PAGE_SECTION_CUSTOM}</h2>
          </EuiTitle>
          <EuiHorizontalRule margin="s" />
          <EuiSpacer size="m" />
          <DashboardsTable />
        </>
      )}

      <SpyRoute pageName={SecurityPageName.dashboardsLanding} />
    </SecuritySolutionPageWrapper>
  );
};
