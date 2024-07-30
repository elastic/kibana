/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom-v5-compat';
import { EuiPageTemplate, EuiPanel, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { SystemLogsPanel } from './quickstart_flows/system_logs';
import { CustomLogsPanel } from './quickstart_flows/custom_logs';
import { OtelLogsPanel } from './quickstart_flows/otel_logs';
import { AutoDetectPanel } from './quickstart_flows/auto_detect';
import { KubernetesPanel } from './quickstart_flows/kubernetes';
import { BackButton } from './shared/back_button';
import { Header } from './header/header_section';
import { OtelHeader } from './header/otel_header';
import { KubernetesHeader } from './header/kubernetes_header';
import { AutoDetectHeader } from './header/auto_detect_header';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <EuiPageTemplate
        css={css`
          padding-top: 0px !important;
        `}
      >
        <EuiPageTemplate.Section paddingSize="xl" color="subdued" restrictWidth>
          <Routes>
            <Route path="/auto-detect">
              <AutoDetectHeader />
              <AutoDetectPanel />
            </Route>
            <Route path="/systemLogs">
              <Header />
              <BackButton />
              <SystemLogsPanel />
            </Route>
            <Route path="/customLogs">
              <Header />
              <BackButton />
              <CustomLogsPanel />
            </Route>
            <Route path="/kubernetes">
              <KubernetesHeader />
              <KubernetesPanel />
            </Route>
            <Route path="/otel-logs">
              <OtelHeader />
              <OtelLogsPanel />
            </Route>
            <Route>
              <Header />
              <OnboardingFlowForm />
            </Route>
          </Routes>
          <EuiSpacer size="xl" />
        </EuiPageTemplate.Section>
        <EuiPageTemplate.Section
          contentProps={{ css: { paddingBlock: 0 } }}
          css={css`
            padding-inline: 0px;
          `}
        >
          <EuiPanel
            hasBorder
            css={css`
              border-radius: 0px;
              border-left: none;
              border-bottom: none;
              border-right: none;
            `}
          >
            <Footer />
            <EuiSpacer size="xl" />
          </EuiPanel>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </QueryClientProvider>
  );
}
