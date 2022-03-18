/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { allNavigationItems } from '../../common/navigation/constants';
import { useCspBreadcrumbs } from '../../common/navigation/use_csp_breadcrumbs';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useCloudPostureStatsApi } from '../../common/api';
import { CspPageTemplate } from '../../components/page_template';
import * as TEXT from './translations';

const CompliancePage = () => {
  const getStats = useCloudPostureStatsApi();
  if (getStats.isLoading) return null;

  return (
    <>
      <SummarySection />
      <EuiSpacer />
      <BenchmarksSection />
      <EuiSpacer />
    </>
  );
};

export const ComplianceDashboard = () => {
  useCspBreadcrumbs([allNavigationItems.dashboard]);

  return (
    <CspPageTemplate
      pageHeader={{
        pageTitle: TEXT.CLOUD_POSTURE,
      }}
      restrictWidth={1600}
    >
      <CompliancePage />
    </CspPageTemplate>
  );
};
