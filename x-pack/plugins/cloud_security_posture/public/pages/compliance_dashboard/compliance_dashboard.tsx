/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiIcon } from '@elastic/eui';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useComplianceDashboardDataApi } from '../../common/api';
import { CspPageTemplate } from '../../components/csp_page_template';
import { type KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';
import { CLOUD_POSTURE, NO_DATA_CONFIG_TEXT } from './translations';

const getNoDataConfig = (onClick: () => void): KibanaPageTemplateProps['noDataConfig'] => ({
  pageTitle: NO_DATA_CONFIG_TEXT.PAGE_TITLE,
  solution: NO_DATA_CONFIG_TEXT.SOLUTION,
  // TODO: Add real docs link once we have it
  docsLink: 'https://www.elastic.co/guide/index.html',
  logo: 'logoSecurity',
  actions: {
    dashboardNoDataCard: {
      icon: <EuiIcon type="refresh" size="xxl" />,
      onClick,
      title: NO_DATA_CONFIG_TEXT.BUTTON_TITLE,
      description: NO_DATA_CONFIG_TEXT.DESCRIPTION,
    },
  },
});

export const ComplianceDashboard = () => {
  const getDashboardDataQuery = useComplianceDashboardDataApi();
  useCspBreadcrumbs([allNavigationItems.dashboard]);
  console.log(getDashboardDataQuery);

  return (
    <CspPageTemplate
      pageHeader={{ pageTitle: CLOUD_POSTURE }}
      restrictWidth={1600}
      query={getDashboardDataQuery}
      noDataConfig={getNoDataConfig(getDashboardDataQuery.refetch)}
    >
      {getDashboardDataQuery.data && (
        <>
          <SummarySection complianceData={getDashboardDataQuery.data} />
          <EuiSpacer />
          <BenchmarksSection complianceData={getDashboardDataQuery.data} />
          <EuiSpacer />
        </>
      )}
    </CspPageTemplate>
  );
};
