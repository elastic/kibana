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
import { useBreadcrumbs } from '@kbn/observability-plugin/public';
import React from 'react';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { breadcrumbsApp } from '../../../application/app';

export function Home() {
  useBreadcrumbs([], breadcrumbsApp);

  const navigateToKibanaUrl = useKibanaNavigation();

  const handleClickSystemLogs = () => {};
  const handleClickCustomLogs = () => {
    navigateToKibanaUrl('/app/observabilityOnboarding/logs');
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
          <h1>Get started with Observability</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" style={{ textAlign: 'center' }}>
          <p>
            Monitor and gain insights across your cloud-native and distributed
            systems on a single platform.
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
                  Quickstart
                </EuiBadge>
              }
              title="Collect system logs"
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
                  The quickest path to onboard log data and start analysing it
                  straight away.
                </p>
                <p>
                  Monitor servers, personal computers and more by collecting
                  logs from your machine.
                </p>
              </EuiText>
            </EuiCard>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={
                <EuiBadge color="hollow" iconType="launch">
                  In a few minutes
                </EuiBadge>
              }
              title="Collect custom logs"
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
                  Choose what logs to collect, configure an ingest pipeline, and
                  explore your data.
                </p>
                <ul>
                  <li>Stream custom logs</li>
                  <li>Collect network streaming logs</li>
                  <li>Upload log files</li>
                  <li>... and more</li>
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
              betaBadgeProps={{ label: 'Setup guide' }}
              title="Monitor my application performance (APM / tracing)"
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickApmSetupGuide}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{ label: 'Setup guide' }}
              title="Monitor my kubernetes clusters"
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
              betaBadgeProps={{ label: 'Integrations' }}
              title="Explore 300+ ways of ingesting data with our Integrations"
              titleSize="xs"
              paddingSize="xl"
              onClick={handleClickIntegrations}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              betaBadgeProps={{ label: 'Sample data' }}
              title="Explore data, visualizations, and dashboards samples"
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
        <EuiButtonEmpty onClick={handleClickSkip}>Skip for now</EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
