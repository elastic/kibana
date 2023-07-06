/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { LandingImageCards } from '../../../common/components/landing_links/landing_links_images';
import { SecurityPageName } from '../../../../common/constants';
import { useCapabilities, useNavigateTo } from '../../../common/lib/kibana';
import { useRootNavLink } from '../../../common/links/nav_links';
import { Title } from '../../../common/components/header_page/title';
import { LinkButton } from '../../../common/components/links/helpers';
import * as i18n from './translations';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../common/lib/telemetry';
import { DASHBOARDS_PAGE_TITLE } from '../translations';
import { useCreateSecurityDashboardLink } from '../../hooks/use_create_security_dashboard_link';
import { DashboardsTable } from '../../components/dashboards_table';

const Header: React.FC<{ canCreateDashboard: boolean }> = ({ canCreateDashboard }) => {
  const { isLoading, url } = useCreateSecurityDashboardLink();
  const { navigateTo } = useNavigateTo();
  return (
    <EuiFlexGroup gutterSize="none" direction="row">
      <EuiFlexItem>
        <Title title={DASHBOARDS_PAGE_TITLE} />
      </EuiFlexItem>
      {canCreateDashboard && (
        <EuiFlexItem grow={false}>
          <LinkButton
            isDisabled={isLoading}
            color="primary"
            fill
            iconType="plusInCircle"
            href={url}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              ev.preventDefault();
              track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.CREATE_DASHBOARD}`);
              navigateTo({ url });
            }}
            data-test-subj="createDashboardButton"
          >
            {i18n.DASHBOARDS_PAGE_CREATE_BUTTON}
          </LinkButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const DashboardsLandingPage = () => {
  const dashboardLinks = useRootNavLink(SecurityPageName.dashboards)?.links ?? [];
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

      <SpyRoute pageName={SecurityPageName.dashboards} />
    </SecuritySolutionPageWrapper>
  );
};
