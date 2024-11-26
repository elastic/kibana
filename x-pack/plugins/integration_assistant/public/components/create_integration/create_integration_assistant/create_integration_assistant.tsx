/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo, useEffect } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Header } from './header';
import { Footer } from './footer';
import { ConnectorStep, isConnectorStepReady } from './steps/connector_step';
import { IntegrationStep, isIntegrationStepReady } from './steps/integration_step';
import { DataStreamStep, isDataStreamStepReady } from './steps/data_stream_step';
import { ReviewStep, isReviewStepReady } from './steps/review_step';
import { CelInputStep, isCelInputStepReady } from './steps/cel_input_step';
import { CelConfirmStep, isCelConfirmStepReady } from './steps/cel_confirm_settings_step';
import { ReviewCelStep, isCelReviewStepReady } from './steps/review_cel_step';
import { DeployStep } from './steps/deploy_step';
import { reducer, initialState, ActionsProvider, type Actions } from './state';
import { useTelemetry } from '../telemetry';
import { ExperimentalFeaturesService } from '../../../services';

export const CreateIntegrationAssistant = React.memo(() => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { generateCel: isGenerateCelEnabled } = ExperimentalFeaturesService.get();

  const telemetry = useTelemetry();
  useEffect(() => {
    telemetry.reportAssistantOpen();
  }, [telemetry]);

  const actions = useMemo<Actions>(
    () => ({
      setStep: (payload) => {
        dispatch({ type: 'SET_STEP', payload });
      },
      setConnector: (payload) => {
        dispatch({ type: 'SET_CONNECTOR', payload });
      },
      setIntegrationSettings: (payload) => {
        dispatch({ type: 'SET_INTEGRATION_SETTINGS', payload });
      },
      // setCelSettings: (payload) => {
      //   dispatch({ type: 'SET_CEL_SETTINGS', payload });
      // },
      setIsGenerating: (payload) => {
        dispatch({ type: 'SET_IS_GENERATING', payload });
      },
      setHasCelInput: (payload) => {
        dispatch({ type: 'SET_HAS_CEL_INPUT', payload });
      },
      setCelSuggestedPaths: (payload) => {
        dispatch({ type: 'SET_CEL_SUGGESTED_PATHS', payload });
      },
      setResult: (payload) => {
        dispatch({ type: 'SET_GENERATED_RESULT', payload });
      },
      setCelInputResult: (payload) => {
        dispatch({ type: 'SET_CEL_INPUT_RESULT', payload });
      },
    }),
    []
  );

  const isNextStepEnabled = useMemo(() => {
    if (state.step === 1) {
      return isConnectorStepReady(state);
    } else if (state.step === 2) {
      return isIntegrationStepReady(state);
    } else if (state.step === 3) {
      return isDataStreamStepReady(state);
    } else if (state.step === 4) {
      return isReviewStepReady(state);
    } else if (isGenerateCelEnabled && state.step === 5) {
      return isCelInputStepReady(state);
    } else if (isGenerateCelEnabled && state.step === 6) {
      return isCelConfirmStepReady(state);
    } else if (isGenerateCelEnabled && state.step === 7) {
      return isCelReviewStepReady(state);
    }
    return false;
  }, [state, isGenerateCelEnabled]);

  return (
    <ActionsProvider value={actions}>
      <KibanaPageTemplate>
        <Header currentStep={state.step} isGenerating={state.isGenerating} />
        <KibanaPageTemplate.Section grow paddingSize="l">
          {state.step === 1 && <ConnectorStep connector={state.connector} />}
          {state.step === 2 && <IntegrationStep integrationSettings={state.integrationSettings} />}
          {state.step === 3 && (
            <DataStreamStep
              integrationSettings={state.integrationSettings}
              connector={state.connector}
              isGenerating={state.isGenerating}
            />
          )}
          {state.step === 4 && (
            <ReviewStep
              integrationSettings={state.integrationSettings}
              isGenerating={state.isGenerating}
              result={state.result}
            />
          )}
          {state.step === 5 &&
            (isGenerateCelEnabled && state.hasCelInput ? (
              <CelInputStep
                integrationSettings={state.integrationSettings}
                connector={state.connector}
                isGenerating={state.isGenerating}
              />
            ) : (
              <DeployStep
                integrationSettings={state.integrationSettings}
                result={state.result}
                connector={state.connector}
              />
            ))}
          {isGenerateCelEnabled && state.step === 6 && (
            <CelConfirmStep
              integrationSettings={state.integrationSettings}
              celSuggestedPaths={state.celSuggestedPaths}
              connector={state.connector}
              isGenerating={state.isGenerating}
            />
          )}

          {isGenerateCelEnabled && state.celInputResult && state.step === 7 && (
            <ReviewCelStep
              isGenerating={state.isGenerating}
              celInputResult={state.celInputResult}
            />
          )}
          {isGenerateCelEnabled && state.step === 8 && (
            <DeployStep
              integrationSettings={state.integrationSettings}
              result={state.result}
              celInputResult={state.celInputResult}
              connector={state.connector}
            />
          )}
        </KibanaPageTemplate.Section>
        <Footer
          currentStep={state.step}
          isGenerating={state.isGenerating}
          hasCelInput={state.hasCelInput}
          isNextStepEnabled={isNextStepEnabled}
        />
      </KibanaPageTemplate>
    </ActionsProvider>
  );
});
CreateIntegrationAssistant.displayName = 'CreateIntegrationAssistant';
