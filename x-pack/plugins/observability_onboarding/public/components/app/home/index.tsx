/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiCard,
  EuiHorizontalRule,
  EuiButtonEmpty,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { breadcrumbsApp } from '../../../application/app';

export function Home() {
  useBreadcrumbs([], breadcrumbsApp);

  const { navigateToKibanaUrl } = useKibanaNavigation();

  const handleClickSystemLogs = () => {};
  const handleClickCustomLogs = () => {
    navigateToKibanaUrl('/app/observabilityOnboarding/customLogs');
  };
  const handleClickApmSetupGuide = () => {
    navigateToKibanaUrl('/app/home#/tutorial/apm');
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
  const handleClickSkip = () => {
    navigateToKibanaUrl('/app/observability/overview');
  };

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      style={{ margin: 'auto', maxWidth: 800 }}
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="l" />
        <EuiTitle size="l">
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
                'Monitor and gain insights across your cloud-native and distributed systems on a single platform.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="xl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiCard
              icon={
                <EuiBadge color="hollow" iconType="bolt">
                  {i18n.translate(
                    'xpack.observability_onboarding.card.systemLogs.quickstartBadge',
                    {
                      defaultMessage: 'Quickstart',
                    }
                  )}
                </EuiBadge>
              }
              title={i18n.translate(
                'xpack.observability_onboarding.card.systemLogs.title',
                { defaultMessage: 'Collect system logs' }
              )}
              selectable={{
                onClick: handleClickSystemLogs,
                color: 'primary',
                fill: true,
                fullWidth: false,
                style: { margin: 'auto' },
              }}
              paddingSize="xl"
            >
              <EuiHorizontalRule
                margin="m"
                style={{
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: '80%',
                }}
              />
              <EuiText color="subdued" size="s" textAlign="left">
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.systemLogs.description1',
                    {
                      defaultMessage:
                        'The quickest path to onboard log data and start analysing it straight away.',
                    }
                  )}
                </p>
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.systemLogs.description2',
                    {
                      defaultMessage:
                        'Monitor servers, personal computers and more by collecting logs from your machine.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={
                <EuiBadge color="hollow" iconType="launch">
                  {i18n.translate(
                    'xpack.observability_onboarding.card.customLogs.fewMinutesBadge',
                    { defaultMessage: 'In a few minutes' }
                  )}
                </EuiBadge>
              }
              title={i18n.translate(
                'xpack.observability_onboarding.card.customLogs.title',
                { defaultMessage: 'Collect custom logs' }
              )}
              selectable={{
                onClick: handleClickCustomLogs,
                color: 'primary',
                fill: true,
                fullWidth: false,
                style: { margin: 'auto' },
              }}
              paddingSize="xl"
            >
              <EuiHorizontalRule
                margin="m"
                style={{
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: '80%',
                }}
              />
              <EuiText color="subdued" size="s" textAlign="left">
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.card.customLogs.description.text',
                    {
                      defaultMessage:
                        'Choose what logs to collect, configure an ingest pipeline, and explore your data.',
                    }
                  )}
                </p>
                <ul>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.card.customLogs.description.example.streamlogs',
                      { defaultMessage: 'Stream custom logs' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.card.customLogs.description.example.networkStream',
                      {
                        defaultMessage: 'Collect network streaming logs',
                      }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.card.customLogs.description.example.uploadLogFile',
                      { defaultMessage: 'Upload log files' }
                    )}
                  </li>
                  <li>
                    {i18n.translate(
                      'xpack.observability_onboarding.card.customLogs.description.example.andMore',
                      { defaultMessage: '... and more' }
                    )}
                  </li>
                </ul>
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{ label: setupGuideBadgeLabel }}
              title={i18n.translate(
                'xpack.observability_onboarding.card.apm.title',
                {
                  defaultMessage:
                    'Monitor my application performance (APM / tracing)',
                }
              )}
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickApmSetupGuide}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{ label: setupGuideBadgeLabel }}
              title={i18n.translate(
                'xpack.observability_onboarding.card.k8s.title',
                { defaultMessage: 'Monitor my kubernetes clusters' }
              )}
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickKubernetesSetupGuide}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiHorizontalRule margin="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiFlexGroup alignItems="stretch">
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{
                label: i18n.translate(
                  'xpack.observability_onboarding.card.integrations.badgeLabel',
                  { defaultMessage: 'Integrations' }
                ),
              }}
              title={i18n.translate(
                'xpack.observability_onboarding.card.integrations.title',
                {
                  defaultMessage:
                    'Explore 300+ ways of ingesting data with our Integrations',
                }
              )}
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickIntegrations}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{
                label: i18n.translate(
                  'xpack.observability_onboarding.card.sampleData.badgeLabel',
                  { defaultMessage: 'Sample data' }
                ),
              }}
              title={i18n.translate(
                'xpack.observability_onboarding.card.sampleData.title',
                {
                  defaultMessage:
                    'Explore data, visualizations, and dashboards samples',
                }
              )}
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickSampleData}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: '100%' }}>
        <EuiHorizontalRule margin="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={handleClickSkip}>
          {i18n.translate('xpack.observability_onboarding.skipLinkLabel', {
            defaultMessage: 'Skip for now',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const setupGuideBadgeLabel = i18n.translate(
  'xpack.observability_onboarding.card.setupGuide',
  { defaultMessage: 'Setup guide' }
);
