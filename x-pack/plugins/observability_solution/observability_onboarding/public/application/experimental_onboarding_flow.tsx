/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import backgroundImageUrl from './header/background.svg';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { Header } from './header/header';
import { SystemLogsModal } from './quickstart_flows/system_logs';
import { CustomLogsModal } from './quickstart_flows/custom_logs';

export function ExperimentalOnboardingFlow() {
  const history = useHistory();

  return (
    <>
      <Route path="/systemLogs">
        <SystemLogsModal onClose={() => history.push('/')} />
      </Route>
      <Route path="/customLogs">
        <CustomLogsModal onClose={() => history.push('/')} />
      </Route>
      {/* Test buttons to be removed once integrations selector has been implemented */}
      <EuiPageTemplate.Section grow={false} color="accent" restrictWidth>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="observabilityOnboardingExperimentalOnboardingFlowSystemLogsButton"
              {...reactRouterNavigate(history, '/systemLogs')}
              color="accent"
            >
              {i18n.translate(
                'xpack.observability_onboarding.experimentalOnboardingFlow.systemLogsButtonLabel',
                { defaultMessage: 'System Logs' }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="observabilityOnboardingExperimentalOnboardingFlowCustomLogsButton"
              {...reactRouterNavigate(history, '/customLogs')}
              color="accent"
            >
              {i18n.translate(
                'xpack.observability_onboarding.experimentalOnboardingFlow.customLogsButtonLabel',
                { defaultMessage: 'Custom Logs' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
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
        <OnboardingFlowForm />
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section paddingSize="xl" grow={false} restrictWidth>
        <Footer />
        <EuiSpacer size="xl" />
      </EuiPageTemplate.Section>
    </>
  );
}
