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
  EuiIcon,
  EuiHorizontalRule,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-plugin/public';
import React from 'react';
import { useKibanaNavigation } from '../../../hooks/use_kibana_navigation';
import { breadcrumbsApp } from '../../../application/app';

export function Home() {
  useBreadcrumbs([], breadcrumbsApp);

  const navigateToKibanaUrl = useKibanaNavigation();

  const handleClickLogsOnboarding = () => {
    navigateToKibanaUrl('/app/observabilityOnboarding/logs');
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
            systems, bringing together application, infrastructure, and user
            telemetry data for end-to-end observability on a single platform.
          </p>
        </EuiText>
        <EuiSpacer size="xl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 400 }}>
        <EuiCard
          layout="vertical"
          icon={<EuiIcon size="xl" type="logoLogging" />}
          title="Collect and analyse logs"
          betaBadgeProps={{ label: 'Quick Start' }}
          description="Choose what logs to collect, and onboard your data in up to 5 minutes to start analysing it straight away."
          onClick={handleClickLogsOnboarding}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiCard
              title="Integrations"
              betaBadgeProps={{ label: 'Integrations' }}
              description="Explore 300+ ways of ingesting data"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              title="Setup guide"
              betaBadgeProps={{ label: 'Setup guide' }}
              description="Monitor kubernetes clusters"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              title="Sample data"
              betaBadgeProps={{ label: 'Sample data' }}
              description="Explore data, visualizations, and dashboards samples"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty href="/app/observability/overview">
          Skip for now
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
