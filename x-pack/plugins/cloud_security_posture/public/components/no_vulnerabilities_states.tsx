/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLoadingLogo,
  EuiEmptyPrompt,
  EuiIcon,
  EuiMarkdownFormat,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { IndexDetails } from '@kbn/cloud-security-posture-common';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { useLocation } from 'react-router-dom';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import { EmptyStatesIllustrationContainer } from './empty_states_illustration_container';
import { VULN_MGMT_POLICY_TEMPLATE } from '../../common/constants';
import { FullSizeCenteredPage } from './full_size_centered_page';
import { CloudPosturePage } from './cloud_posture_page';
import {
  NO_VULNERABILITIES_STATUS_TEST_SUBJ,
  CNVM_NOT_INSTALLED_ACTION_SUBJ,
  THIRD_PARTY_INTEGRATIONS_NO_VULNERABILITIES_FINDINGS_PROMPT,
  THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_WIZ_INTEGRATION_BUTTON,
} from './test_subjects';
import { useCspIntegrationLink } from '../common/navigation/use_csp_integration_link';
import { useCISIntegrationPoliciesLink } from '../common/navigation/use_navigate_to_cis_integration_policies';
import { PostureTypes } from '../../common/types_old';
import { useAdd3PIntegrationRoute } from '../common/api/use_wiz_integration_route';
import cloudsSVG from '../assets/illustrations/clouds.svg';
import { cspIntegrationDocsNavigation } from '../common/navigation/constants';
import vulnerabilitiesVendorsSVG from '../assets/illustrations/vulnerabilities_vendors.svg';

const REFETCH_INTERVAL_MS = 20000;

const ScanningVulnerabilitiesEmptyPrompt = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_VULNERABILITIES_STATUS_TEST_SUBJ.SCANNING_VULNERABILITIES}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.scanningVulnerabilitiesEmptyPrompt.indexingButtonTitle"
          defaultMessage="Scanning your environment"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.scanningVulnerabilitiesEmptyPrompt.indexingDescription"
          defaultMessage="Results will appear here as soon as they are available."
        />
      </p>
    }
  />
);

const CnvmIntegrationNotInstalledEmptyPrompt = ({
  vulnMgmtIntegrationLink,
}: {
  vulnMgmtIntegrationLink?: string;
}) => {
  const location = useLocation();
  const { euiTheme } = useEuiTheme();
  const wizAddIntegrationLink = useAdd3PIntegrationRoute('wiz');
  const is3PSupportedPage = location.pathname.includes(findingsNavigation.vulnerabilities.path);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiEmptyPrompt
          style={{ padding: euiTheme.size.l }}
          data-test-subj={NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_INSTALLED}
          icon={
            <EmptyStatesIllustrationContainer>
              <EuiImage size="fullWidth" src={cloudsSVG} alt="clouds" role="presentation" />
            </EmptyStatesIllustrationContainer>
          }
          title={
            <h2>
              <FormattedMessage
                id="xpack.csp.vulnerabilties.intergationNoInstalledEmptyPrompt.promptTitle"
                defaultMessage="Elastic’s Cloud Native {lineBreak} Vulnerability Management"
                values={{
                  lineBreak: <br />,
                }}
              />
            </h2>
          }
          layout="vertical"
          color="plain"
          body={
            <p>
              <FormattedMessage
                id="xpack.csp.vulnerabilties.intergationNoInstalledEmptyPrompt.promptDescription"
                defaultMessage="
                Detect and remediate potential vulnerabilities {lineBreak} in your cloud assets, with our Cloud Native {lineBreak} Vulnerability Management(CNVM) integration. {lineBreak} {learnMore}"
                values={{
                  lineBreak: <br />,
                  learnMore: (
                    <EuiLink href={cspIntegrationDocsNavigation.cnvm.overviewPath} target="_blank">
                      <FormattedMessage
                        id="xpack.csp.vulnerabilties.intergationNoInstalledEmptyPrompt.learnMoreButtonTitle"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          }
          actions={
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  href={vulnMgmtIntegrationLink}
                  isDisabled={!vulnMgmtIntegrationLink}
                  data-test-subj={CNVM_NOT_INSTALLED_ACTION_SUBJ}
                >
                  <FormattedMessage
                    id="xpack.csp.vulnerabilties.intergationNoInstalledEmptyPrompt.addVulMngtIntegrationButtonTitle"
                    defaultMessage="Add CNVM Integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      {is3PSupportedPage && (
        <EuiFlexItem>
          <EuiEmptyPrompt
            style={{ padding: euiTheme.size.l }}
            data-test-subj={THIRD_PARTY_INTEGRATIONS_NO_VULNERABILITIES_FINDINGS_PROMPT}
            icon={
              <EmptyStatesIllustrationContainer>
                <EuiImage
                  size="fullWidth"
                  src={vulnerabilitiesVendorsSVG}
                  alt="vulnerabilitiesVendorsSVG"
                  role="presentation"
                />
              </EmptyStatesIllustrationContainer>
            }
            title={
              <h2>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.3pIntegrationsNoVulnFindingsPrompt.promptTitle"
                  defaultMessage="Already using a {lineBreak} cloud security product?"
                  values={{ lineBreak: <br /> }}
                />
              </h2>
            }
            layout="vertical"
            color="plain"
            body={
              <p>
                <FormattedMessage
                  id="xpack.csp.cloudPosturePage.3pIntegrationsNoVulnFindingsPrompt.promptDescription"
                  defaultMessage="Ingest data from your existing vulnerability {lineBreak} solution for centralized analytics, hunting, {lineBreak} investigations, visualizations, and more. {lineBreak} Other integrations coming soon."
                  values={{ lineBreak: <br /> }}
                />
              </p>
            }
            actions={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="primary"
                    fill
                    href={wizAddIntegrationLink}
                    isDisabled={!wizAddIntegrationLink}
                    data-test-subj={
                      THIRD_PARTY_NO_VULNERABILITIES_FINDINGS_PROMPT_WIZ_INTEGRATION_BUTTON
                    }
                  >
                    <FormattedMessage
                      id="xpack.csp.cloudPosturePage.3pIntegrationsNoVulnFindingsPrompt.addWizIntegrationButtonTitle"
                      defaultMessage="Add Wiz Integration"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const CnvmIndexTimeout = () => (
  <EuiEmptyPrompt
    data-test-subj={NO_VULNERABILITIES_STATUS_TEST_SUBJ.INDEX_TIMEOUT}
    color="plain"
    icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.indexTimeout.indexTimeoutTitle"
          defaultMessage="Findings Delayed"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.indexTimeout.indexTimeoutDescription"
          defaultMessage="Scanning workloads is taking longer than expected. Please check {docs}"
          values={{
            docs: (
              <EuiLink href="https://ela.st/cnvm-faq" target="_blank">
                <FormattedMessage
                  id="xpack.csp.noVulnerabilitiesStates.indexTimeout.indexTimeoutDocLink"
                  defaultMessage="CNVM FAQ"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    }
  />
);

const Unprivileged = ({ unprivilegedIndices }: { unprivilegedIndices: string[] }) => (
  <EuiEmptyPrompt
    data-test-subj={NO_VULNERABILITIES_STATUS_TEST_SUBJ.UNPRIVILEGED}
    color="plain"
    icon={<EuiIcon type="logoSecurity" size="xl" />}
    title={
      <h2>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.unprivileged.unprivilegedTitle"
          defaultMessage="Privileges required"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.csp.noVulnerabilitiesStates.unprivileged.unprivilegedDescription"
          defaultMessage="To view cloud posture data, you must update privileges. For more information, contact your Kibana administrator."
        />
      </p>
    }
    footer={
      <EuiMarkdownFormat
        css={css`
          text-align: initial;
        `}
        children={
          i18n.translate(
            'xpack.csp.noVulnerabilitiesStates.unprivileged.unprivilegedFooterMarkdown',
            {
              defaultMessage:
                'Required Elasticsearch index privilege `read` for the following indices:',
            }
          ) + unprivilegedIndices.map((idx) => `\n- \`${idx}\``)
        }
      />
    }
  />
);
const AgentNotDeployedEmptyPrompt = ({ postureType }: { postureType: PostureTypes }) => {
  const integrationPoliciesLink = useCISIntegrationPoliciesLink({
    postureType,
  });

  return (
    <EuiEmptyPrompt
      data-test-subj={NO_VULNERABILITIES_STATUS_TEST_SUBJ.NOT_DEPLOYED}
      color="plain"
      iconType="fleetApp"
      title={
        <h2>
          <FormattedMessage
            id="xpack.csp.noVulnerabilitiesStates.noAgentsDeployed.noAgentsDeployedTitle"
            defaultMessage="No Agents Installed"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.csp.noVulnerabilitiesStates.noAgentsDeployed.noAgentsDeployedDescription"
            defaultMessage="In order to begin detecting vulnerabilities, you'll need to deploy elastic-agent into the cloud account or Kubernetes cluster you want to monitor."
          />
        </p>
      }
      actions={[
        <EuiButton fill href={integrationPoliciesLink} isDisabled={!integrationPoliciesLink}>
          <FormattedMessage
            id="xpack.csp.noVulnerabilitiesStates.noAgentsDeployed.noAgentsDeployedButtonTitle"
            defaultMessage="Install Agent"
          />
        </EuiButton>,
      ]}
    />
  );
};

/**
 * This component will return the render states based on cloud posture setup status API
 * since 'not-installed' is being checked globally by CloudPosturePage and 'indexed' is the pass condition, those states won't be handled here
 * */
export const NoVulnerabilitiesStates = () => {
  const getSetupStatus = useCspSetupStatusApi({
    refetchInterval: REFETCH_INTERVAL_MS,
  });
  const vulnMgmtIntegrationLink = useCspIntegrationLink(VULN_MGMT_POLICY_TEMPLATE);

  const status = getSetupStatus.data?.vuln_mgmt?.status;
  const indicesStatus = getSetupStatus.data?.indicesDetails;
  const unprivilegedIndices =
    indicesStatus &&
    indicesStatus
      .filter((idxDetails) => idxDetails.status === 'unprivileged')
      .map((idxDetails: IndexDetails) => idxDetails.index)
      .sort((a, b) => a.localeCompare(b));

  const render = () => {
    if (status === 'indexing' || status === 'waiting_for_results')
      return <ScanningVulnerabilitiesEmptyPrompt />; // integration installed, but no agents added// agent added, index timeout has passed
    if (status === 'index-timeout') return <CnvmIndexTimeout />;
    if (status === 'not-installed')
      return (
        <CnvmIntegrationNotInstalledEmptyPrompt vulnMgmtIntegrationLink={vulnMgmtIntegrationLink} />
      );
    if (status === 'not-deployed')
      return <AgentNotDeployedEmptyPrompt postureType={VULN_MGMT_POLICY_TEMPLATE} />;
    if (status === 'unprivileged')
      return <Unprivileged unprivilegedIndices={unprivilegedIndices || []} />; // user has no privileges for our indices
  };

  return (
    <CloudPosturePage query={getSetupStatus}>
      <FullSizeCenteredPage>{render()}</FullSizeCenteredPage>
    </CloudPosturePage>
  );
};
