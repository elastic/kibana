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
import { useCspmStatsApi, useKspmStatsApi } from '../../common/api/use_stats_api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import { cspIntegrationDocsNavigation } from '../../common/navigation/constants';

const noDataOptions: Record<
  PosturePolicyTemplate,
  Pick<CspNoDataPageProps, 'docsLink' | 'actionTitle' | 'actionDescription'> & { testId: string }
> = {
  kspm: {
    testId: KSPM_INTEGRATION_NOT_INSTALLED_TEST_SUBJECT,
    docsLink: cspIntegrationDocsNavigation.kspm.overviewPath,
    actionTitle: i18n.translate(
      'xpack.csp.cloudPosturePage.kspmIntegration.packageNotInstalled.buttonLabel',
      { defaultMessage: 'Add a KSPM integration' }
    ),
    actionDescription: (
      <FormattedMessage
        id="xpack.csp.cloudPosturePage.kspmIntegration.packageNotInstalled.description"
        defaultMessage="Use our {integrationFullName} (KSPM) integration to detect security misconfigurations in your Kubernetes clusters."
        values={{
          integrationFullName: (
            <EuiLink href={cspIntegrationDocsNavigation.kspm.overviewPath} target="_blank">
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
    docsLink: cspIntegrationDocsNavigation.cspm.overviewPath,
    actionTitle: i18n.translate(
      'xpack.csp.cloudPosturePage.cspmIntegration.packageNotInstalled.buttonLabel',
      { defaultMessage: 'Add a CSPM integration' }
    ),
    actionDescription: (
      <FormattedMessage
        id="xpack.csp.cloudPosturePage.cspmIntegration.packageNotInstalled.description"
        defaultMessage="Use our {integrationFullName} (CSPM) integration to detect security misconfigurations in your cloud infrastructure."
        values={{
          integrationFullName: (
            <EuiLink href={cspIntegrationDocsNavigation.cspm.overviewPath} target="_blank">
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
  dashboardType,
}: {
  complianceData: ComplianceDashboardData | undefined;
  notInstalledConfig: CspNoDataPageProps;
  isIntegrationInstalled?: boolean;
  dashboardType: PosturePolicyTemplate;
}) => {
  const noFindings = !complianceData || complianceData.stats.totalFindings === 0;

  // integration is not installed, and there are no findings for this integration
  if (noFindings && !isIntegrationInstalled) {
    return <CspNoDataPage {...notInstalledConfig} />;
  }

  // integration is installed, but there are no findings for this integration
  if (noFindings && isIntegrationInstalled) {
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
                defaultMessage="Findings Evaluation Status"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.csp.integrationDashboard.noFindingsPrompt.promptDescription"
                defaultMessage="Waiting for data to be collected and indexed. If this process is taking longer than expected then please reach out our support"
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
      <SummarySection complianceData={complianceData!} dashboardType={dashboardType} />
      <EuiSpacer />
      <BenchmarksSection complianceData={complianceData!} dashboardType={dashboardType} />
      <EuiSpacer />
    </>
  );
};

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(CSPM_POLICY_TEMPLATE);
  const getSetupStatus = useCspSetupStatusApi();
  const hasFindingsKspm =
    getSetupStatus.data?.kspm?.status === 'indexed' ||
    getSetupStatus.data?.indicesDetails[0].status === 'not-empty';
  const hasFindingsCspm =
    getSetupStatus.data?.cspm?.status === 'indexed' ||
    getSetupStatus.data?.indicesDetails[0].status === 'not-empty';
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);

  const getCspmDashboardData = useCspmStatsApi({
    enabled: hasFindingsCspm,
  });
  const getKspmDashboardData = useKspmStatsApi({
    enabled: hasFindingsKspm,
  });

  useEffect(() => {
    const selectInitialTab = () => {
      const cspmTotalFindings = getCspmDashboardData.data?.stats.totalFindings;
      const kspmTotalFindings = getKspmDashboardData.data?.stats.totalFindings;
      const installedPolicyTemplatesCspm = getSetupStatus.data?.cspm?.status;
      const installedPolicyTemplatesKspm = getSetupStatus.data?.kspm?.status;
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
      else if (
        installedPolicyTemplatesCspm !== 'unprivileged' &&
        installedPolicyTemplatesCspm !== 'not-installed'
      ) {
        preferredDashboard = CSPM_POLICY_TEMPLATE;
      }
      // kspm is installed
      else if (
        installedPolicyTemplatesKspm !== 'unprivileged' &&
        installedPolicyTemplatesKspm !== 'not-installed'
      ) {
        preferredDashboard = KSPM_POLICY_TEMPLATE;
      }
      setSelectedTab(preferredDashboard);
    };
    selectInitialTab();
  }, [
    getCspmDashboardData.data?.stats.totalFindings,
    getKspmDashboardData.data?.stats.totalFindings,
    getSetupStatus.data?.cspm?.status,
    getSetupStatus.data?.kspm?.status,
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
          <>
            {hasFindingsCspm ? (
              <CloudPosturePage query={getCspmDashboardData}>
                <div data-test-subj={CLOUD_DASHBOARD_CONTAINER}>
                  <IntegrationPostureDashboard
                    dashboardType={CSPM_POLICY_TEMPLATE}
                    complianceData={getCspmDashboardData.data}
                    notInstalledConfig={getNotInstalledConfig(
                      CSPM_POLICY_TEMPLATE,
                      cspmIntegrationLink
                    )}
                    isIntegrationInstalled={
                      getSetupStatus.data?.cspm?.status !== 'unprivileged' &&
                      getSetupStatus.data?.cspm?.status !== 'not-installed'
                    }
                  />
                </div>
              </CloudPosturePage>
            ) : (
              <NoFindingsStates posturetype={'cspm'} />
            )}
          </>
        ),
      },
      {
        label: i18n.translate('xpack.csp.dashboardTabs.kubernetesTab.tabTitle', {
          defaultMessage: 'Kubernetes',
        }),
        isSelected: selectedTab === KSPM_POLICY_TEMPLATE,
        onClick: () => setSelectedTab(KSPM_POLICY_TEMPLATE),
        content: (
          <>
            {hasFindingsKspm ? (
              <CloudPosturePage query={getKspmDashboardData}>
                <div data-test-subj={KUBERNETES_DASHBOARD_CONTAINER}>
                  <IntegrationPostureDashboard
                    dashboardType={KSPM_POLICY_TEMPLATE}
                    complianceData={getKspmDashboardData.data}
                    notInstalledConfig={getNotInstalledConfig(
                      KSPM_POLICY_TEMPLATE,
                      kspmIntegrationLink
                    )}
                    isIntegrationInstalled={
                      getSetupStatus.data?.kspm?.status !== 'unprivileged' &&
                      getSetupStatus.data?.kspm?.status !== 'not-installed'
                    }
                  />
                </div>
              </CloudPosturePage>
            ) : (
              <NoFindingsStates posturetype={'kspm'} />
            )}
          </>
        ),
      },
    ],
    [
      cspmIntegrationLink,
      getCspmDashboardData,
      getKspmDashboardData,
      getSetupStatus.data?.kspm?.status,
      getSetupStatus.data?.cspm?.status,
      kspmIntegrationLink,
      selectedTab,
      hasFindingsKspm,
      hasFindingsCspm,
    ]
  );

  return (
    <CloudPosturePage query={selectedTab === 'cspm' ? getCspmDashboardData : getKspmDashboardData}>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <CloudPosturePageTitle
            title={i18n.translate('xpack.csp.dashboard.cspPageTemplate.pageTitle', {
              defaultMessage: 'Cloud Security Posture',
            })}
          />
        }
        tabs={tabs.map(({ content, ...rest }) => rest)}
      />
      <EuiSpacer />
      <div
        data-test-subj={DASHBOARD_CONTAINER}
        css={css`
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
