/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiPageHeader } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KubernetesPostureDashboard } from './kubernetes_posture_dashboard/kubernetes_posture_dashboard';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import { CloudPosturePage } from '../../components/cloud_posture_page';
import { DASHBOARD_CONTAINER } from './test_subjects';
import { useComplianceDashboardDataApi } from '../../common/api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('kspm');

  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const getDashboardData = useComplianceDashboardDataApi({
    enabled: hasFindings,
  });

  const tabs = [
    {
      label: 'Cloud',
      isSelected: selectedTab === 'cspm',
      onClick: () => setSelectedTab('cspm'),
      content: <>WIP</>,
    },
    {
      label: 'Kubernetes',
      isSelected: selectedTab === 'kspm',
      onClick: () => setSelectedTab('kspm'),
      content: <KubernetesPostureDashboard />,
    },
  ];

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
