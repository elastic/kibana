/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import styled from '@emotion/styled';
import { breadcrumbsApp } from '../../../application/app';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import apacheIcon from '../../../icons/apache.svg';
import apmIcon from '../../../icons/apm.svg';
import awsIcon from '../../../icons/aws.svg';
import azureIcon from '../../../icons/azure.svg';
import gcpIcon from '../../../icons/gcp.svg';
import kinesisIcon from '../../../icons/kinesis.svg';
import kubernetesIcon from '../../../icons/kubernetes.svg';
import loggingIcon from '../../../icons/logging.svg';
import nginxIcon from '../../../icons/nginx.svg';
import opentelemetryIcon from '../../../icons/opentelemetry.svg';
import systemIcon from '../../../icons/system.svg';

const StyledItem = styled(EuiFlexItem)`
  flex-direction: row;
  &:before {
    content: '•';
    width: 5px;
    height: 5px;
    margin: 0 20px 0 16px;
  }
  > a {
    min-width: 100%;
  }
`;

export function Home() {
  useBreadcrumbs([], breadcrumbsApp);
  const { euiTheme } = useEuiTheme();

  const { navigateToKibanaUrl } = useKibanaNavigation();

  const handleClickSystemLogs = () => {
    navigateToKibanaUrl('/app/observabilityOnboarding/systemLogs');
  };
  const handleClickCustomLogs = () => {
    navigateToKibanaUrl('/app/observabilityOnboarding/customLogs');
  };
  const handleClickApmSetupGuide = () => {
    navigateToKibanaUrl('/app/apm/tutorial');
  };
  const handleClickKubernetesSetupGuide = () => {
    navigateToKibanaUrl('/app/integrations/detail/kubernetes');
  };
  const handleClickIntegrations = () => {
    navigateToKibanaUrl('/app/integrations');
  };
  const handleClickSampleData = () => {
    navigateToKibanaUrl('/app/home#/tutorial_directory/sampleData');
  };
  const handleClickUploadFile = () => {
    navigateToKibanaUrl('/app/home#/tutorial_directory/fileDataViz');
  };

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      style={{ margin: 'auto', maxWidth: 800 }}
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="l" />
        <EuiTitle size="l" data-test-subj="obltOnboardingHomeTitle">
          <h1>
            {i18n.translate('xpack.observability_onboarding.home.title', {
              defaultMessage: 'Get started with Observability',
            })}
          </h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" style={{ textAlign: 'center' }}>
          <p>
            {i18n.translate('xpack.observability_onboarding.home.description', {
              defaultMessage:
                'Select your method for collecting data into Observability.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="xl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon type={systemIcon} size="l" />}
              betaBadgeProps={{
                'data-test-subj': 'obltOnboardingHomeQuickstartBadge',
                color: 'accent',
                label: i18n.translate(
                  'xpack.observability_onboarding.card.systemLogs.quickstartBadge',
                  { defaultMessage: 'Quickstart' }
                ),
              }}
              title={i18n.translate(
                'xpack.observability_onboarding.card.systemLogs.title',
                { defaultMessage: 'Stream host system logs' }
              )}
              footer={
                <EuiButton onClick={handleClickSystemLogs} color="primary" fill>
                  {getStartedLabel}
                </EuiButton>
              }
              style={{
                borderColor: euiTheme.colors.accent,
                borderWidth: 2,
              }}
              paddingSize="l"
              display="plain"
              hasBorder
            >
              <EuiSpacer size="s" />
              <EuiBadge color="hollow">{elasticAgentLabel}</EuiBadge>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s" textAlign="left">
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.systemLogs.description1',
                    {
                      defaultMessage:
                        'The quickest path to onboard log data from your own machine or server.',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </EuiCard>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon type={loggingIcon} size="l" />}
              title={i18n.translate(
                'xpack.observability_onboarding.card.customLogs.title',
                { defaultMessage: 'Stream log files' }
              )}
              footer={
                <EuiButton
                  onClick={handleClickCustomLogs}
                  color="primary"
                  fill
                  data-test-subj="obltOnboardingHomeStartLogFileStream"
                >
                  {getStartedLabel}
                </EuiButton>
              }
              paddingSize="l"
              display="plain"
              hasBorder
            >
              <EuiSpacer size="s" />
              <EuiBadge color="hollow">{elasticAgentLabel}</EuiBadge>
              <EuiSpacer size="m" />
              <EuiText color="subdued" size="s" textAlign="left">
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.customLogs.description.text',
                    {
                      defaultMessage:
                        'Stream any logs into Elastic in a simple way and explore their data.',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="s" />
            </EuiCard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiCard
              icon={
                <EuiFlexGroup gutterSize="m" justifyContent="center">
                  <EuiIcon type={apmIcon} size="l" />
                  <EuiIcon type={opentelemetryIcon} size="l" />
                </EuiFlexGroup>
              }
              title={i18n.translate(
                'xpack.observability_onboarding.card.apm.title',
                {
                  defaultMessage: 'Collect application performance data',
                }
              )}
              description={i18n.translate(
                'xpack.observability_onboarding.card.apm.description',
                {
                  defaultMessage:
                    'Collect traces, logs, and metrics from OpenTelemetry or APM custom agent.',
                }
              )}
              footer={
                <EuiButton onClick={handleClickApmSetupGuide} color="primary">
                  {getStartedLabel}
                </EuiButton>
              }
              paddingSize="m"
              titleSize="xs"
              display="plain"
              hasBorder
              onClick={handleClickApmSetupGuide}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon type={kubernetesIcon} size="l" />}
              title={i18n.translate(
                'xpack.observability_onboarding.card.k8s.title',
                { defaultMessage: 'Collect Kubernetes clusters data' }
              )}
              description={i18n.translate(
                'xpack.observability_onboarding.card.k8s.description',
                {
                  defaultMessage:
                    'Collect logs and metrics from Kubernetes clusters with Elastic agent.',
                }
              )}
              footer={
                <EuiButton
                  onClick={handleClickKubernetesSetupGuide}
                  color="primary"
                >
                  {getStartedLabel}
                </EuiButton>
              }
              titleSize="xs"
              paddingSize="m"
              display="plain"
              hasBorder
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiCard
          icon={
            <EuiFlexGroup
              gutterSize="m"
              justifyContent="center"
              style={{ marginTop: euiTheme.size.l }}
            >
              <EuiIcon type={kinesisIcon} size="l" />
              <EuiIcon type={awsIcon} size="l" />
              <EuiIcon type={apacheIcon} size="l" />
              <EuiIcon type={nginxIcon} size="l" />
              <EuiIcon type={gcpIcon} size="l" />
              <EuiIcon type={azureIcon} size="l" />
            </EuiFlexGroup>
          }
          title={i18n.translate(
            'xpack.observability_onboarding.card.integrations.title',
            {
              defaultMessage:
                'Explore 300+ ways of ingesting data with our integrations',
            }
          )}
          footer={
            <>
              <EuiButton onClick={handleClickIntegrations} color="primary">
                {i18n.translate(
                  'xpack.observability_onboarding.card.integrations.start',
                  { defaultMessage: 'Start exploring' }
                )}
              </EuiButton>
              <EuiHorizontalRule />
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.integrations.quickLinks',
                    { defaultMessage: 'Quick links:' }
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="none">
                    <EuiLink onClick={handleClickSampleData}>
                      {i18n.translate(
                        'xpack.observability_onboarding.card.integrations.sampleData',
                        { defaultMessage: 'Use sample data' }
                      )}
                    </EuiLink>
                    <StyledItem>
                      <EuiLink onClick={handleClickUploadFile}>
                        {i18n.translate(
                          'xpack.observability_onboarding.card.integrations.uploadFile',
                          { defaultMessage: 'Upload a file' }
                        )}
                      </EuiLink>
                    </StyledItem>
                    <StyledItem>
                      <EuiLink
                        href="https://www.elastic.co/guide/en/kinesis/current/aws-firehose-setup-guide.html"
                        target="_blank"
                        external
                      >
                        {i18n.translate(
                          'xpack.observability_onboarding.card.integrations.awsFirehose',
                          { defaultMessage: 'AWS Firehose' }
                        )}
                      </EuiLink>
                    </StyledItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          }
          titleSize="xs"
          paddingSize="none"
          display="plain"
          hasBorder
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const getStartedLabel = i18n.translate(
  'xpack.observability_onboarding.card.getStarted',
  { defaultMessage: 'Get started' }
);

const elasticAgentLabel = i18n.translate(
  'xpack.observability_onboarding.card.elasticAgent',
  { defaultMessage: 'Elastic agent' }
);
