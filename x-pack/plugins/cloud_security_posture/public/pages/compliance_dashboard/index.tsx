/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { SummarySection } from './dashboard_sections/summary_section';
import { AccumulatedSection } from './dashboard_sections/accumulated_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { useCloudPostureStatsApi } from '../../common/api';

import { CspPageTemplate } from '../../components/page_template';

export const dateValueToTuple = ({ date, value }: { date: number; value: number }) => [date, value];

const CompliancePage = () => {
  const getStats = useCloudPostureStatsApi();
  if (getStats.isLoading) return null;

  return (
    <>
      <EuiTitle>
        <h3>{'Summary'}</h3>
      </EuiTitle>
      <EuiSpacer />
      <SummarySection />
      <EuiSpacer />
      <AccumulatedSection />
      <EuiSpacer />
      <EuiTitle>
        <h3>{'Benchmarks'}</h3>
      </EuiTitle>
      <EuiSpacer />
      <BenchmarksSection />
      <EuiSpacer />
    </>
  );
};

export const ComplianceDashboard = () => (
  <CspPageTemplate
    pageHeader={{
      pageTitle: 'Compliance',
    }}
  >
    <CompliancePage />
  </CspPageTemplate>
);
