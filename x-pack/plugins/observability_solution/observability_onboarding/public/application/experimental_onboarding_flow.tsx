/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useRef } from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';
import { EuiButtonEmpty, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import backgroundImageUrl from './header/background.svg';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { Header } from './header/header';
import { SystemLogsPanel } from './quickstart_flows/system_logs';
import { CustomLogsPanel } from './quickstart_flows/custom_logs';

const queryClient = new QueryClient();

export function ExperimentalOnboardingFlow() {
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

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
        `}
        grow={false}
        restrictWidth
      >
        <EuiSpacer size="xl" />
        <Header />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" color="subdued" restrictWidth>
        <div ref={mainContentRef}>
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
        </div>
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" grow={false} restrictWidth>
        <Footer />
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
    </QueryClientProvider>
  );
}

const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="observabilityOnboardingExperimentalOnboardingFlowBackToSelectionButton"
        iconType="arrowLeft"
        flush="left"
        onClick={() => navigate(`../${location.search}`)}
      >
        {i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.button.backToSelectionLabel',
          { defaultMessage: 'Back to selection' }
        )}
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
    </>
  );
};
