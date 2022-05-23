/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiIcon } from '@elastic/eui';
import { type KibanaPageTemplateProps } from '@kbn/kibana-react-plugin/public';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useComplianceDashboardDataApi } from '../../common/api';
import { CspPageTemplate } from '../../components/csp_page_template';
import { CLOUD_POSTURE, NO_DATA_CONFIG_TEXT } from './translations';
import { useInfoApi } from '../../common/api/use_info_api';

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
  const getInfo = useInfoApi();
  const getDashboardData = useComplianceDashboardDataApi({
    enabled: getInfo.data?.latestFindingsIndexStatus === 'applicable',
  });
  useCspBreadcrumbs([allNavigationItems.dashboard]);

  // if (!getInfo.isSuccess)
  if (false)
    return (
      <CspPageTemplate
        pageHeader={{ pageTitle: CLOUD_POSTURE }}
        query={getInfo}
        noDataConfig={
          getInfo.data?.latestFindingsIndexStatus !== 'applicable'
            ? getNoDataConfig(getInfo.refetch)
            : undefined
        }
      />
    );

  return (
    <CspPageTemplate
      pageHeader={{ pageTitle: CLOUD_POSTURE }}
      restrictWidth={1600}
      query={getDashboardData}
    >
      {getDashboardData.data && (
        <>
          <SummarySection complianceData={getDashboardData.data} />
          <EuiSpacer />
          <BenchmarksSection complianceData={getDashboardData.data} />
          <EuiSpacer />
        </>
      )}
    </CspPageTemplate>
  );
};
