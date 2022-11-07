/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { INTERNAL_FEATURE_FLAGS } from '../../../common/constants';
import { CloudSummarySection } from './dashboard_sections/cloud_summary_section';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { DASHBOARD_CONTAINER } from './test_subjects';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useComplianceDashboardDataApi } from '../../common/api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudBenchmarksSection } from './dashboard_sections/cloud_benchmarks_section';

export const ComplianceDashboard = () => {
  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const getDashboardData = useComplianceDashboardDataApi({
    enabled: hasFindings,
  });

  if (!hasFindings) return <NoFindingsStates />;

  return (
    <CloudPosturePage query={getDashboardData}>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <CloudPosturePageTitle
            title={i18n.translate('xpack.csp.dashboard.cspPageTemplate.pageTitle', {
              defaultMessage: 'Cloud Posture',
            })}
          />
        }
      />
      <EuiSpacer />
      <div
        data-test-subj={DASHBOARD_CONTAINER}
        css={css`
          max-width: 1440px;
          margin-left: auto;
          margin-right: auto;
        `}
      >
        {INTERNAL_FEATURE_FLAGS.showNewDashboard ? (
          <>
            <CloudSummarySection complianceData={getDashboardData.data!} />
            <EuiSpacer />
            <CloudBenchmarksSection complianceData={getDashboardData.data!} />
            <EuiSpacer />
          </>
        ) : (
          <>
            <SummarySection complianceData={getDashboardData.data!} />
            <EuiSpacer />
            <BenchmarksSection complianceData={getDashboardData.data!} />
            <EuiSpacer />
          </>
        )}
      </div>
    </CloudPosturePage>
  );
};
