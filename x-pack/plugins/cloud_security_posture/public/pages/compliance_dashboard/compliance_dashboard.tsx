/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiLink, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import { ComplianceDashboardData } from '../../../common/types';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import {
  CloudPosturePage,
  CspNoDataPage,
  CspNoDataPageProps,
} from '../../components/cloud_posture_page';
import { DASHBOARD_CONTAINER } from './test_subjects';
import {
  useCspmComplianceDashboardDataApi,
  useKspmComplianceDashboardDataApi,
} from '../../common/api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudSummarySection } from './dashboard_sections/cloud_summary_section';
import { CloudBenchmarksSection } from './dashboard_sections/cloud_benchmarks_section';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  POLICY_TEMPLATE,
} from '../../../common/constants';

const IntegrationPostureDashboard = ({
  complianceData,
  notInstalledConfig,
  showInstallationPrompt,
}: {
  complianceData: ComplianceDashboardData;
  notInstalledConfig: CspNoDataPageProps;
  showInstallationPrompt?: boolean;
}) => {
  const noData = complianceData.stats.totalFindings === 0;

  if (noData) return <div>empty</div>;
  if (showInstallationPrompt && notInstalledConfig)
    return <CspNoDataPage {...notInstalledConfig} />;

  return (
    <>
      <CloudSummarySection complianceData={complianceData} />
      <EuiSpacer />
      <CloudBenchmarksSection complianceData={complianceData} />
      <EuiSpacer />
    </>
  );
};

const noDataOptions: Record<
  POLICY_TEMPLATE,
  Pick<CspNoDataPageProps, 'docsLink' | 'actionTitle' | 'actionDescription'>
> = {
  kspm: {
    docsLink: 'https://ela.st/kspm',
    actionTitle: i18n.translate(
      'xpack.csp.cloudPosturePage.kspmIntegration.packageNotInstalled.buttonLabel',
      { defaultMessage: 'Add a KSPM integration' }
    ),
    actionDescription: (
      <FormattedMessage
        id="xpack.csp.cloudPosturePage.kspmIntegration.packageNotInstalled.description"
        defaultMessage="Use our {integrationFullName} (KSPM) integration to measure your Kubernetes cluster setup against CIS recommendations."
        values={{
          integrationFullName: (
            <EuiLink href="https://ela.st/kspm">
              <FormattedMessage
                id="xpack.csp.cloudPosturePage.kspmIntegration.packageNotInstalled.integrationNameLabel"
                defaultMessage="Kubernetes Security Posture Management"
              />
            </EuiLink>
          ),
        }}
      />
    ),
  },
  cspm: {
    docsLink: 'https://ela.st/cspm',
    actionTitle: i18n.translate(
      'xpack.csp.cloudPosturePage.cspmIntegration.packageNotInstalled.buttonLabel',
      { defaultMessage: 'Add a CSPM integration' }
    ),
    actionDescription: (
      <FormattedMessage
        id="xpack.csp.cloudPosturePage.cspmIntegration.packageNotInstalled.description"
        defaultMessage="Use our {integrationFullName} (CSPM) integration to measure your Cloud account setup against CIS recommendations."
        values={{
          integrationFullName: (
            <EuiLink href="https://ela.st/cspm">
              <FormattedMessage
                id="xpack.csp.cloudPosturePage.cspmIntegration.packageNotInstalled.integrationNameLabel"
                defaultMessage="Cloud Security Posture Management"
              />
            </EuiLink>
          ),
        }}
      />
    ),
  },
};

const getNotInstalledConfig = (
  policyTemplate: POLICY_TEMPLATE,
  actionHref: CspNoDataPageProps['actionHref']
) => ({
  pageTitle: i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.pageTitle', {
    defaultMessage: 'Install Integration to get started',
  }),
  docsLink: noDataOptions[policyTemplate].docsLink,
  actionHref,
  actionTitle: noDataOptions[policyTemplate].actionTitle,
  actionDescription: noDataOptions[policyTemplate].actionDescription,
});

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('kspm');
  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);

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
        isSelected: selectedTab === CSPM_POLICY_TEMPLATE,
        onClick: () => setSelectedTab(CSPM_POLICY_TEMPLATE),
        content: (
          <CloudPosturePage query={getCspmDashboardData}>
            <IntegrationPostureDashboard
              complianceData={getCspmDashboardData.data!}
              notInstalledConfig={getNotInstalledConfig(CSPM_POLICY_TEMPLATE, cspmIntegrationLink)}
              showInstallationPrompt={
                !getSetupStatus.data?.installedPolicyTemplates.includes(CSPM_POLICY_TEMPLATE)
              }
            />
          </CloudPosturePage>
        ),
      },
      {
        label: 'Kubernetes',
        isSelected: selectedTab === KSPM_POLICY_TEMPLATE,
        onClick: () => setSelectedTab(KSPM_POLICY_TEMPLATE),
        content: (
          <CloudPosturePage query={getKspmDashboardData}>
            <IntegrationPostureDashboard
              complianceData={getKspmDashboardData.data!}
              notInstalledConfig={getNotInstalledConfig(KSPM_POLICY_TEMPLATE, kspmIntegrationLink)}
              showInstallationPrompt={
                !getSetupStatus.data?.installedPolicyTemplates.includes(KSPM_POLICY_TEMPLATE)
              }
            />
          </CloudPosturePage>
        ),
      },
    ],
    [getCspmDashboardData, getKspmDashboardData, getNotInstalledConfig, selectedTab]
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
