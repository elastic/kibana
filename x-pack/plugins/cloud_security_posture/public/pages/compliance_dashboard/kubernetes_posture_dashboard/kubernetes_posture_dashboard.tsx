/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KubernetesBenchmarksSection } from './kubernetes_benchmarks_section';
import { KubernetesSummarySection } from './kubernetes_summary_section';
import { useCspSetupStatusApi } from '../../../common/api/use_setup_status_api';
import { useComplianceDashboardDataApi } from '../../../common/api';

export const KubernetesPostureDashboard = () => {
  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const getDashboardData = useComplianceDashboardDataApi({
    enabled: hasFindings,
  });

  return (
    <>
      <KubernetesSummarySection complianceData={getDashboardData.data!} />
      <EuiSpacer />
      <KubernetesBenchmarksSection complianceData={getDashboardData.data!} />
      <EuiSpacer />
    </>
  );
};
