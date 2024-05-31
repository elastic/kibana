/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { useAssistantContext, useLoadConnectors } from '@kbn/elastic-assistant';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { IntegrationAssistantHeader } from './header';
import { useAssistantState } from './hooks/use_assistant_state';
import { IntegrationAssistantBottomBar } from './bottom_bar';
import { ConnectorSetup, isConnectorSetupReady } from './steps/connector_setup';
import { ConfigureIntegration, isConfigureIntegrationReady } from './steps/configure_integration';
import { isLogsAnalysisReady, LogsAnalysis } from './steps/logs_analysis';
import { isPipelineGenerationReady, PipelineGeneration } from './steps/pipeline_generation';

const useContentCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    width: 100%;
    max-width: 80em;
    padding: ${euiTheme.size.l};
  `;
};

export const IntegrationAssistant = React.memo(() => {
  const { state, actions } = useAssistantState();
  // const spaceId = useSpaceId() ?? 'default';
  const contendCss = useContentCss();

  const {
    assistantAvailability: { isAssistantEnabled },
    http,
  } = useAssistantContext();

  const { data: aiConnectors, isLoading: isLoadingConnectors } = useLoadConnectors({ http });
  const { setConnectorId } = actions;
  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    }
  }, [aiConnectors, setConnectorId]);

  const isNextStepEnabled = useMemo(() => {
    if (state.step === 1) {
      return isConnectorSetupReady({ connectorId: state.connectorId });
    } else if (state.step === 2) {
      return isConfigureIntegrationReady({ integrationSettings: state.integrationSettings });
    } else if (state.step === 3) {
      return isLogsAnalysisReady({ integrationSettings: state.integrationSettings });
    } else if (state.step === 4) {
      return isPipelineGenerationReady({ result: state.result, isGenerating: state.isGenerating });
    }
    return false;
  }, [state]);

  if (!isAssistantEnabled) {
    return (
      <>
        <EuiSpacer size="xxl" />
        {'Upgrade'} {/* TODO: implement upgrade page */}
      </>
    );
  }

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem css={contendCss}>
            <IntegrationAssistantHeader
              currentStep={state.step}
              setStep={actions.setStep}
              isGenerating={state.isGenerating}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section grow>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem css={contendCss}>
            {state.step === 1 && (
              <ConnectorSetup
                isLoadingConnectors={isLoadingConnectors}
                selectedConnectorId={state.connectorId}
                onConnectorIdSelected={actions.setConnectorId}
              />
            )}
            {state.step === 2 && (
              <ConfigureIntegration
                integrationSettings={state.integrationSettings}
                setIntegrationSettings={actions.setIntegrationSettings}
              />
            )}
            {state.step === 3 && (
              <LogsAnalysis
                integrationSettings={state.integrationSettings}
                setIntegrationSettings={actions.setIntegrationSettings}
              />
            )}
            {state.step === 4 && (
              <PipelineGeneration
                integrationSettings={state.integrationSettings}
                setIntegrationSettings={actions.setIntegrationSettings}
                setIsGenerating={actions.setIsGenerating}
                setResult={actions.setResult}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.BottomBar>
        <IntegrationAssistantBottomBar
          currentStep={state.step}
          setStep={actions.setStep}
          isNextStepEnabled={isNextStepEnabled}
        />
      </KibanaPageTemplate.BottomBar>
    </KibanaPageTemplate>
  );
});
IntegrationAssistant.displayName = 'IntegrationAssistant';
