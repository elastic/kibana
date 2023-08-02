/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { EuiEmptyPrompt, EuiIcon, EuiLink, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { NO_FINDINGS_STATUS_TEST_SUBJ } from '../../components/test_subjects';
import { useCspIntegrationLink } from '../../common/navigation/use_csp_integration_link';
import type {
  PosturePolicyTemplate,
  ComplianceDashboardData,
  BaseCspSetupStatus,
} from '../../../common/types';
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
  KUBERNETES_DASHBOARD_TAB,
  CLOUD_DASHBOARD_TAB,
  CLOUD_POSTURE_DASHBOARD_PAGE_HEADER,
} from './test_subjects';
import { useCspmStatsApi, useKspmStatsApi } from '../../common/api/use_stats_api';
import { useCspSetupStatusApi } from '../../common/api/use_setup_status_api';
import { NoFindingsStates } from '../../components/no_findings_states';
import { SummarySection } from './dashboard_sections/summary_section';
import { BenchmarksSection } from './dashboard_sections/benchmarks_section';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import { cspIntegrationDocsNavigation } from '../../common/navigation/constants';

const REFETCH_INTERVAL_MS = 20000;

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

const getDefaultTab = (
  pluginStatus?: BaseCspSetupStatus,
  cspmStats?: ComplianceDashboardData,
  kspmStats?: ComplianceDashboardData
) => {
  const cspmTotalFindings = cspmStats?.stats.totalFindings;
  const kspmTotalFindings = kspmStats?.stats.totalFindings;
  const installedPolicyTemplatesCspm = pluginStatus?.cspm?.status;
  const installedPolicyTemplatesKspm = pluginStatus?.kspm?.status;
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

  return preferredDashboard;
};

const TabContent = ({
  posturetype,
  getDashboardData,
  getSetupStatus,
}: {
  posturetype: PosturePolicyTemplate;
  getDashboardData: UseQueryResult<ComplianceDashboardData>;
  getSetupStatus: BaseCspSetupStatus;
}) => {
  const isCloudSecurityPostureInstalled = !!getSetupStatus?.installedPackageVersion;
  const setupStatus = getSetupStatus?.[posturetype]?.status;
  const renderNoFindings =
    !isCloudSecurityPostureInstalled ||
    (setupStatus !== 'indexed' && setupStatus !== 'not-installed');
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);
  let integrationLink;
  let dataTestSubj;
  let policyTemplate: PosturePolicyTemplate;

  switch (posturetype) {
    case 'cspm':
      integrationLink = cspmIntegrationLink;
      dataTestSubj = CLOUD_DASHBOARD_CONTAINER;
      policyTemplate = CSPM_POLICY_TEMPLATE;
      break;
    case 'kspm':
      integrationLink = kspmIntegrationLink;
      dataTestSubj = KUBERNETES_DASHBOARD_CONTAINER;
      policyTemplate = KSPM_POLICY_TEMPLATE;
      break;
  }

  if (renderNoFindings) {
    return <NoFindingsStates posturetype={posturetype} />;
  }

  return (
    <CloudPosturePage query={getDashboardData}>
      <div data-test-subj={dataTestSubj}>
        <IntegrationPostureDashboard
          dashboardType={policyTemplate}
          complianceData={getDashboardData.data}
          notInstalledConfig={getNotInstalledConfig(policyTemplate, integrationLink)}
          isIntegrationInstalled={setupStatus !== 'not-installed'}
        />
      </div>
    </CloudPosturePage>
  );
};

export const ComplianceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState(CSPM_POLICY_TEMPLATE);
  const { data: getSetupStatus } = useCspSetupStatusApi({
    refetchInterval: (data) => {
      if (selectedTab === CSPM_POLICY_TEMPLATE && data?.cspm?.status === 'indexed') {
        return false;
      }

      if (selectedTab === KSPM_POLICY_TEMPLATE && data?.kspm?.status === 'indexed') {
        return false;
      }

      return REFETCH_INTERVAL_MS;
    },
  });
  const isCloudSecurityPostureInstalled = !!getSetupStatus?.installedPackageVersion;
  const getCspmDashboardData = useCspmStatsApi({
    enabled: isCloudSecurityPostureInstalled,
    refetchInterval: (data) => {
      if (selectedTab === CSPM_POLICY_TEMPLATE && data?.stats.totalFindings === 0) {
        return REFETCH_INTERVAL_MS;
      }

      return false;
    },
  });
  const getKspmDashboardData = useKspmStatsApi({
    enabled: isCloudSecurityPostureInstalled,
    refetchInterval: (data) => {
      if (selectedTab === KSPM_POLICY_TEMPLATE && data?.stats.totalFindings === 0) {
        return REFETCH_INTERVAL_MS;
      }

      return false;
    },
  });

  useEffect(() => {
    const preferredDashboard = getDefaultTab(
      getSetupStatus,
      getCspmDashboardData.data,
      getKspmDashboardData.data
    );
    setSelectedTab(preferredDashboard);
  }, [
    getCspmDashboardData.data,
    getCspmDashboardData.data?.stats.totalFindings,
    getKspmDashboardData.data,
    getKspmDashboardData.data?.stats.totalFindings,
    getSetupStatus,
    getSetupStatus?.cspm?.status,
    getSetupStatus?.kspm?.status,
  ]);

  const tabs = useMemo(
    () =>
      isCloudSecurityPostureInstalled
        ? [
            {
              label: i18n.translate('xpack.csp.dashboardTabs.cloudTab.tabTitle', {
                defaultMessage: 'Cloud',
              }),
              'data-test-subj': CLOUD_DASHBOARD_TAB,
              isSelected: selectedTab === CSPM_POLICY_TEMPLATE,
              onClick: () => setSelectedTab(CSPM_POLICY_TEMPLATE),
              content: (
                <TabContent
                  posturetype="cspm"
                  getDashboardData={getCspmDashboardData}
                  getSetupStatus={getSetupStatus}
                />
              ),
            },
            {
              label: i18n.translate('xpack.csp.dashboardTabs.kubernetesTab.tabTitle', {
                defaultMessage: 'Kubernetes',
              }),
              'data-test-subj': KUBERNETES_DASHBOARD_TAB,
              isSelected: selectedTab === KSPM_POLICY_TEMPLATE,
              onClick: () => setSelectedTab(KSPM_POLICY_TEMPLATE),
              content: (
                <TabContent
                  posturetype="kspm"
                  getDashboardData={getKspmDashboardData}
                  getSetupStatus={getSetupStatus}
                />
              ),
            },
          ]
        : [],
    [
      selectedTab,
      isCloudSecurityPostureInstalled,
      getKspmDashboardData,
      getCspmDashboardData,
      getSetupStatus,
    ]
  );

  return (
    <CloudPosturePage>
      <EuiPageHeader
        data-test-subj={CLOUD_POSTURE_DASHBOARD_PAGE_HEADER}
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
        {!isCloudSecurityPostureInstalled && <NoFindingsStates posturetype={'cspm'} />}
      </div>
    </CloudPosturePage>
  );
};
