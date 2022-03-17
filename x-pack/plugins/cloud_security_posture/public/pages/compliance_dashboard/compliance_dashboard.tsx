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
import { useComplianceDashboardDataApi } from '../../common/api';
import { CspPageTemplate } from '../../components/csp_page_template';
import * as TEXT from './translations';

const NO_DATA_CONFIG = {};

export const ComplianceDashboard = () => {
  const getDashboarDataQuery = useComplianceDashboardDataApi();
  useCspBreadcrumbs([allNavigationItems.dashboard]);

  return (
    <CspPageTemplate
      pageHeader={{
        pageTitle: TEXT.CLOUD_POSTURE,
      }}
      status={getDashboarDataQuery.status}
      noDataConfig={!getDashboarDataQuery.data ? NO_DATA_CONFIG : undefined}
    >
      {getDashboarDataQuery.data && (
        <>
          <SummarySection complianceData={getDashboarDataQuery.data} />
          <EuiSpacer />
          <BenchmarksSection complianceData={getDashboarDataQuery.data} />
          <EuiSpacer />
        </>
      )}
    </CspPageTemplate>
  );
};
