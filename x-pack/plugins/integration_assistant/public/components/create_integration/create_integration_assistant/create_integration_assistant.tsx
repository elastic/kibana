/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Header } from './header';
import { useAssistantState } from './hooks/use_assistant_state';
import { BottomBar } from './bottom_bar';
import { ConnectorStep, isConnectorStepReady } from './steps/connector_step';
import { IntegrationStep, isIntegrationStepReady } from './steps/integration_step';
import { DataStreamStep, isDataStreamStepReady } from './steps/data_stream_step';
import { ReviewStep, isReviewStepReady } from './steps/review_step';
import { DeployStep } from './steps/deploy_step';

export const CreateIntegrationAssistant = React.memo(() => {
  const { state, actions } = useAssistantState();

  const {
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();

  const isNextStepEnabled = useMemo(() => {
    if (state.step === 1) {
      return isConnectorStepReady(state);
    } else if (state.step === 2) {
      return isIntegrationStepReady(state);
    } else if (state.step === 3) {
      return isDataStreamStepReady(state);
    } else if (state.step === 4) {
      return isReviewStepReady(state);
    }
    return false;
  }, [state]);

  const onGenerate = useCallback(() => actions.setIsGenerating(true), [actions]);

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
      <Header
        currentStep={state.step}
        setStep={actions.setStep}
        isGenerating={state.isGenerating}
      />
      <KibanaPageTemplate.Section grow paddingSize="l">
        {state.step === 1 && (
          <ConnectorStep connectorId={state.connectorId} setConnectorId={actions.setConnectorId} />
        )}
        {state.step === 2 && (
          <IntegrationStep
            integrationSettings={state.integrationSettings}
            setIntegrationSettings={actions.setIntegrationSettings}
          />
        )}
        {state.step === 3 && (
          <DataStreamStep
            integrationSettings={state.integrationSettings}
            connectorId={state.connectorId}
            isGenerating={state.isGenerating}
            setIntegrationSettings={actions.setIntegrationSettings}
            setIsGenerating={actions.setIsGenerating}
            setResult={actions.setResult}
            setStep={actions.setStep}
          />
        )}
        {state.step === 4 && (
          <ReviewStep
            integrationSettings={state.integrationSettings}
            connectorId={state.connectorId}
            isGenerating={state.isGenerating}
            result={state.result}
            setIntegrationSettings={actions.setIntegrationSettings}
            setIsGenerating={actions.setIsGenerating}
            setResult={actions.setResult}
          />
        )}
        {state.step === 5 && (
          <DeployStep
            integrationSettings={state.integrationSettings}
            result={state.result}
            connectorId={state.connectorId}
          />
        )}
      </KibanaPageTemplate.Section>
      <BottomBar
        currentStep={state.step}
        setStep={actions.setStep}
        onGenerate={onGenerate}
        isGenerating={state.isGenerating}
        isNextStepEnabled={isNextStepEnabled}
      />
    </KibanaPageTemplate>
  );
});
CreateIntegrationAssistant.displayName = 'CreateIntegrationAssistant';
