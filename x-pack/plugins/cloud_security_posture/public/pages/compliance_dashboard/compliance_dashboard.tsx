/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiIcon, EuiPageHeader } from '@elastic/eui';
import { NoDataPage } from '@kbn/kibana-react-plugin/public';
import { UseQueryResult } from 'react-query';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { cloudPosturePages } from '../../common/navigation/constants';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { DASHBOARD_CONTAINER, MISSING_FINDINGS_NO_DATA_CONFIG } from './test_subjects';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useComplianceDashboardDataApi } from '../../common/api';
import { CspPageTemplate } from '../../components/csp_page_template';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';

const NoData = ({ onClick }: { onClick: () => void }) => (
  <NoDataPage
    css={css`
      margin-top: 50px;
      margin-left: auto;
      margin-right: auto;
      max-width: 950px;
    `}
    data-test-subj={MISSING_FINDINGS_NO_DATA_CONFIG}
    pageTitle={i18n.translate('xpack.csp.dashboard.noDataConfig.pageTitle', {
      defaultMessage: 'Cloud Posture Dashboard',
    })}
    solution={i18n.translate('xpack.csp.dashboard.noDataConfig.solutionNameTitle', {
      defaultMessage: 'Cloud Security Posture',
    })}
    // TODO: Add real docs link once we have it
    docsLink={'https://www.elastic.co/guide/index.html'}
    logo={'logoSecurity'}
    actions={{
      dashboardNoDataCard: {
        icon: <EuiIcon type="refresh" size="xxl" />,
        onClick,
        title: i18n.translate('xpack.csp.dashboard.noDataConfig.actionTitle', {
          defaultMessage: 'Try Again',
        }),
        description: i18n.translate('xpack.csp.dashboard.noDataConfig.actionDescription', {
          defaultMessage:
            "The cloud posture dashboard can't be presented since there are no findings. This can happen due to the agent not being installed yet, or since data is still being processed.",
        }),
      },
    }}
  />
);

export const ComplianceDashboardNoPageTemplate = () => {
  const getInfo = useCspSetupStatusApi();
  const isFindingsIndexApplicable = getInfo.data?.status === 'indexed';
  const getDashboardData = useComplianceDashboardDataApi({
    enabled: isFindingsIndexApplicable,
  });

  const pageQuery: UseQueryResult = isFindingsIndexApplicable ? getDashboardData : getInfo;

  return (
    <CloudPosturePage query={pageQuery}>
      <EuiPageHeader
        bottomBorder
        pageTitle={i18n.translate('xpack.csp.dashboard.cspPageTemplate.pageTitle', {
          defaultMessage: 'Cloud Posture',
        })}
      />
      <EuiSpacer />
      {isFindingsIndexApplicable ? (
        <div
          data-test-subj={DASHBOARD_CONTAINER}
          css={css`
            max-width: 1600px;
            margin-left: auto;
            margin-right: auto;
          `}
        >
          <SummarySection complianceData={getDashboardData.data!} />
          <EuiSpacer />
          <BenchmarksSection complianceData={getDashboardData.data!} />
          <EuiSpacer />
        </div>
      ) : (
        <NoData onClick={getInfo.refetch} />
      )}
    </CloudPosturePage>
  );
};

const COMPLIANCE_DASHBOARD_BREADCRUMBS = [cloudPosturePages.dashboard];

export const ComplianceDashboard = () => {
  useCspBreadcrumbs(COMPLIANCE_DASHBOARD_BREADCRUMBS);

  return (
    <CspPageTemplate>
      <ComplianceDashboardNoPageTemplate />
    </CspPageTemplate>
  );
};
