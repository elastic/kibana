/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiEmptyPrompt, EuiIcon, EuiLink, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { NO_FINDINGS_STATUS_TEST_SUBJ } from '../../components/test_subjects';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import type { PosturePolicyTemplate, ComplianceDashboardData } from '../../../common/types';
import { CloudPosturePageTitle } from '../../components/cloud_posture_page_title';
import {
  CloudPosturePage,
  CspNoDataPage,
  CspNoDataPageProps,
  KSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
  CSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
} from '../../components/cloud_posture_page';
import {
  CLOUD_DASHBOARD_CONTAINER,
  DASHBOARD_CONTAINER,
  KUBERNETES_DASHBOARD_CONTAINER,
} from './test_subjects';
import { useCspmStatsApi, useKspmStatsApi } from '../../common/api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { CloudSummarySection } from './dashboard_sections/cloud_summary_section';
import { CloudBenchmarksSection } from './dashboard_sections/cloud_benchmarks_section';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';

const noDataOptions: Record<
  PosturePolicyTemplate,
  Pick<CspNoDataPageProps, 'docsLink' | 'actionTitle' | 'actionDescription'> & { testId: string }
> = {
  kspm: {
    testId: KSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
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
    testId: CSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
    // TODO: CIS AWS - replace link or create the docs
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
            // TODO: CIS AWS - replace link or create the docs
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
  policyTemplate: PosturePolicyTemplate,
  actionHref: CspNoDataPageProps['actionHref']
) => {
  const policyTemplateNoDataConfig = noDataOptions[policyTemplate];

  return {
    pageTitle: i18n.translate('xpack.csp.cloudPosturePage.packageNotInstalled.pageTitle', {
      defaultMessage: 'Install Integration to get started',
    }),
    docsLink: policyTemplateNoDataConfig.docsLink,
    actionHref,
    actionTitle: policyTemplateNoDataConfig.actionTitle,
    actionDescription: policyTemplateNoDataConfig.actionDescription,
    testId: policyTemplateNoDataConfig.testId,
  };
};

const KIBANA_HEADERS_HEIGHT = 265;

const IntegrationPostureDashboard = ({
  complianceData,
  notInstalledConfig,
  isIntegrationInstalled,
}: {
  complianceData: ComplianceDashboardData | undefined;
  notInstalledConfig: CspNoDataPageProps;
  isIntegrationInstalled?: boolean;
}) => {
  const noFindings = !complianceData || complianceData.stats.totalFindings === 0;

  // integration is not installed, and there are no findings for this integration
  if (noFindings && !isIntegrationInstalled) {
    return <CspNoDataPage {...notInstalledConfig} />;
  }

  // integration is installed, but there are no findings for this integration
  if (noFindings) {
    return (
      // height is calculated for the screen height minus the kibana header, page title, and tabs
      <div
        style={{
          height: `calc(100vh - ${KIBANA_HEADERS_HEIGHT}px)`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <EuiEmptyPrompt
          data-test-subj={NO_FINDINGS_STATUS_TEST_SUBJ.NO_FINDINGS}
          color="plain"
          icon={<EuiIcon type="logoSecurity" size="xl" />}
          title={
            <h2>
              <FormattedMessage
                id="xpack.csp.integrationDashboard.noFindings.promptTitle"
                defaultMessage="No Findings"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.csp.integrationDashboard.noFindingsPrompt.promptDescription"
                defaultMessage="Integration installed but you dont have findings"
              />
            </p>
          }
        />
      </div>
    );
  }

  // there are findings, displays dashboard even if integration is not installed
  return (
    <>
      <CloudSummarySection complianceData={complianceData} />
      <EuiSpacer />
      <CloudBenchmarksSection complianceData={complianceData} />
      <EuiSpacer />
    </>
  );
};

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(CSPM_POLICY_TEMPLATE);
  const getSetupStatus = useCspSetupStatusApi();
  const hasFindings = getSetupStatus.data?.status === 'indexed';
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);

  const getCspmDashboardData = useCspmStatsApi({
    enabled: hasFindings,
  });
  const getKspmDashboardData = useKspmStatsApi({
    enabled: hasFindings,
  });

  useEffect(() => {
    const selectInitialTab = () => {
      const cspmTotalFindings = getCspmDashboardData.data?.stats.totalFindings;
      const kspmTotalFindings = getKspmDashboardData.data?.stats.totalFindings;
      const installedPolicyTemplates = getSetupStatus.data?.installedPolicyTemplates;

      let preferredDashboard = CSPM_POLICY_TEMPLATE;

      // cspm has findings
      if (!!cspmTotalFindings) {
        preferredDashboard = CSPM_POLICY_TEMPLATE;
      }
      // kspm has findings
      else if (!!kspmTotalFindings) {
        preferredDashboard = KSPM_POLICY_TEMPLATE;
      }
      // cspm is installed
      else if (installedPolicyTemplates?.includes(CSPM_POLICY_TEMPLATE)) {
        preferredDashboard = CSPM_POLICY_TEMPLATE;
      }
      // kspm is installed
      else if (installedPolicyTemplates?.includes(KSPM_POLICY_TEMPLATE)) {
        preferredDashboard = KSPM_POLICY_TEMPLATE;
      }

      setSelectedTab(preferredDashboard);
    };
    selectInitialTab();
  }, [
    getCspmDashboardData.data?.stats.totalFindings,
    getKspmDashboardData.data?.stats.totalFindings,
    getSetupStatus.data?.installedPolicyTemplates,
  ]);

  const tabs = useMemo(
    () => [
      {
        label: i18n.translate('xpack.csp.dashboardTabs.cloudTab.tabTitle', {
          defaultMessage: 'Cloud',
        }),
        isSelected: selectedTab === CSPM_POLICY_TEMPLATE,
        onClick: () => setSelectedTab(CSPM_POLICY_TEMPLATE),
        content: (
          <CloudPosturePage query={getCspmDashboardData}>
            <div data-test-subj={CLOUD_DASHBOARD_CONTAINER}>
              <IntegrationPostureDashboard
                complianceData={getCspmDashboardData.data}
                notInstalledConfig={getNotInstalledConfig(
                  CSPM_POLICY_TEMPLATE,
                  cspmIntegrationLink
                )}
                isIntegrationInstalled={getSetupStatus.data?.installedPolicyTemplates.includes(
                  CSPM_POLICY_TEMPLATE
                )}
              />
            </div>
          </CloudPosturePage>
        ),
      },
      {
        label: i18n.translate('xpack.csp.dashboardTabs.kubernetesTab.tabTitle', {
          defaultMessage: 'Kubernetes',
        }),
        isSelected: selectedTab === KSPM_POLICY_TEMPLATE,
        onClick: () => setSelectedTab(KSPM_POLICY_TEMPLATE),
        content: (
          <CloudPosturePage query={getKspmDashboardData}>
            <div data-test-subj={KUBERNETES_DASHBOARD_CONTAINER}>
              <IntegrationPostureDashboard
                complianceData={getKspmDashboardData.data}
                notInstalledConfig={getNotInstalledConfig(
                  KSPM_POLICY_TEMPLATE,
                  kspmIntegrationLink
                )}
                isIntegrationInstalled={getSetupStatus.data?.installedPolicyTemplates.includes(
                  KSPM_POLICY_TEMPLATE
                )}
              />
            </div>
          </CloudPosturePage>
        ),
      },
    ],
    [
      cspmIntegrationLink,
      getCspmDashboardData,
      getKspmDashboardData,
      getSetupStatus.data?.installedPolicyTemplates,
      kspmIntegrationLink,
      selectedTab,
    ]
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
          height: 100%;
        `}
      >
        {tabs.find((t) => t.isSelected)?.content}
      </div>
    </CloudPosturePage>
  );
};
