/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ComplianceDashboardData } from '../../../common/types';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { DASHBOARD_CONTAINER } from './test_subjects';
import {
  useCspmComplianceDashboardDataApi,
  useKspmComplianceDashboardDataApi,
} from '../../common/api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudSummarySection } from './dashboard_sections/cloud_summary_section';
import { CloudBenchmarksSection } from './dashboard_sections/cloud_benchmarks_section';

const PostureDashboard = ({ complianceData }: { complianceData: ComplianceDashboardData }) => (
  <>
    <CloudSummarySection complianceData={complianceData} />
    <EuiSpacer />
    <CloudBenchmarksSection complianceData={complianceData} />
    <EuiSpacer />
  </>
);

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('kspm');

  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const getCspmDashboardData = useCspmComplianceDashboardDataApi({
    enabled: hasFindings,
  });
  const getKspmDashboardData = useKspmComplianceDashboardDataApi({
    enabled: hasFindings,
  });

  const tabs = useMemo(
    () => [
      {
        label: 'Cloud',
        isSelected: selectedTab === 'cspm',
        onClick: () => setSelectedTab('cspm'),
        content: <PostureDashboard complianceData={getCspmDashboardData.data!} />,
      },
      {
        label: 'Kubernetes',
        isSelected: selectedTab === 'kspm',
        onClick: () => setSelectedTab('kspm'),
        content: <PostureDashboard complianceData={getKspmDashboardData.data!} />,
      },
    ],
    [getCspmDashboardData.data, getKspmDashboardData.data, selectedTab]
  );

  if (!hasFindings) return <NoFindingsStates />;

  return (
    <CloudPosturePage query={selectedTab === 'cspm' ? getCspmDashboardData : getKspmDashboardData}>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <CloudPosturePageTitle
            title={i18n.translate('xpack.csp.dashboard.cspPageTemplate.pageTitle', {
              defaultMessage: 'Cloud Posture',
            })}
          />
        }
        tabs={tabs.map(({ content, ...rest }) => rest)}
      />
      <EuiSpacer />
      <div
        data-test-subj={DASHBOARD_CONTAINER}
        css={css`
          max-width: 1600px;
          margin-left: auto;
          margin-right: auto;
        `}
      >
        {tabs.find((t) => t.isSelected)?.content}
      </div>
    </CloudPosturePage>
  );
};
