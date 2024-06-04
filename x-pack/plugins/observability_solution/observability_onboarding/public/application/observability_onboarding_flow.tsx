/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom-v5-compat';
import { CommonProps, EuiPageTemplate, EuiPanel, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SerializedStyles } from '@emotion/serialize';
import backgroundImageUrl from './header/background.svg';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { Header } from './header/header';
import { SystemLogsPanel } from './quickstart_flows/system_logs';
import { CustomLogsPanel } from './quickstart_flows/custom_logs';
import { BackButton } from './shared/back_button';
import { ConfigSchema } from '..';

const queryClient = new QueryClient();

export function ObservabilityOnboardingFlow() {
  const { pathname } = useLocation();

  const theme = useEuiTheme();
  const [midSectionCss, footerContentCss] = useFooterCss();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <EuiPageTemplate.Section
        paddingSize="xl"
        css={css`
          & > div {
            background-image: url(${backgroundImageUrl});
            background-position: right center;
            background-repeat: no-repeat;
          }
          & {
            background-color: ${theme.euiTheme.colors.ghost};
          }
        `}
        grow={false}
        restrictWidth
      >
        <EuiSpacer size="xl" />
        <Header />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section css={midSectionCss} paddingSize="xl" color="subdued" restrictWidth>
        <Routes>
          <Route path="/systemLogs">
            <BackButton />
            <SystemLogsPanel />
          </Route>
          <Route path="/customLogs">
            <BackButton />
            <CustomLogsPanel />
          </Route>
          <Route>
            <OnboardingFlowForm />
          </Route>
        </Routes>
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section
        contentProps={footerContentCss}
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
    </QueryClientProvider>
  );
}

function useFooterCss(): [SerializedStyles, CommonProps & React.HTMLAttributes<HTMLDivElement>] {
  const kibana = useKibana<{ config: ConfigSchema }>();
  return kibana.services.config?.serverless.enabled
    ? [
        css`
          min-height: 900px;
        `,
        { css: { paddingBlock: 0 } },
      ]
    : [
        css`
          min-height: 850px;
        `,
        { css: { paddingBlock: 0, maxWidth: 'none !important' } },
      ];
}
