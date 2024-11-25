/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useMemo, useEffect, useCallback } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Header } from './header';
import { Footer } from './footer';
import { useNavigate, Page } from '../../../common/hooks/use_navigate';
import { ConnectorStep, isConnectorStepReady } from './steps/connector_step';
import { IntegrationStep, isIntegrationStepReady } from './steps/integration_step';
import { DataStreamStep, isDataStreamStepReady } from './steps/data_stream_step';
import { ReviewStep, isReviewStepReady } from './steps/review_step';
import { CelInputStep, isCelInputStepReady } from './steps/cel_input_step';
import { ReviewCelStep, isCelReviewStepReady } from './steps/review_cel_step';
import { DeployStep } from './steps/deploy_step';
import { reducer, initialState, ActionsProvider, type Actions } from './state';
import { useTelemetry } from '../telemetry';
import { ExperimentalFeaturesService } from '../../../services';

export const CreateIntegrationAssistant = React.memo(() => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();
  const { generateCel: isGenerateCelEnabled } = ExperimentalFeaturesService.get();

  const celInputStepIndex = isGenerateCelEnabled && state.hasCelInput ? 5 : null;
  const celReviewStepIndex = isGenerateCelEnabled && state.celInputResult ? 6 : null;
  const deployStepIndex =
    celInputStepIndex !== null || celReviewStepIndex !== null || state.step === 7 ? 7 : 5;

  const telemetry = useTelemetry();
  useEffect(() => {
    telemetry.reportAssistantOpen();
  }, [telemetry]);

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
      return isCelReviewStepReady(state);
    }
    return false;
  }, [state, isGenerateCelEnabled]);

  const goBackStep = useCallback(() => {
    if (state.step === 1) {
      navigate(Page.landing);
    } else {
      dispatch({ type: 'SET_STEP', payload: state.step - 1 });
    }
  }, [navigate, dispatch, state.step]);

  const completeStep = useCallback(() => {
    if (!isNextStepEnabled) {
      // If the user tries to navigate to the next step without completing the current step.
      return;
    }
    telemetry.reportAssistantStepComplete({ step: state.step });
    if (state.step === 3 || state.step === 5) {
      dispatch({ type: 'SET_IS_GENERATING', payload: true });
    } else {
      dispatch({ type: 'SET_STEP', payload: state.step + 1 });
    }
  }, [telemetry, state.step, isNextStepEnabled]);

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
      setIsGenerating: (payload) => {
        dispatch({ type: 'SET_IS_GENERATING', payload });
      },
      setHasCelInput: (payload) => {
        dispatch({ type: 'SET_HAS_CEL_INPUT', payload });
      },
      setResult: (payload) => {
        dispatch({ type: 'SET_GENERATED_RESULT', payload });
      },
      setCelInputResult: (payload) => {
        dispatch({ type: 'SET_CEL_INPUT_RESULT', payload });
      },
      completeStep,
    }),
    [completeStep]
  );

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
          {state.step === celInputStepIndex && (
            <CelInputStep
              integrationSettings={state.integrationSettings}
              connector={state.connector}
              isGenerating={state.isGenerating}
            />
          )}
          {state.step === celReviewStepIndex && (
            <ReviewCelStep
              isGenerating={state.isGenerating}
              celInputResult={state.celInputResult}
            />
          )}

          {state.step === deployStepIndex && (
            <DeployStep
              integrationSettings={state.integrationSettings}
              result={state.result}
              celInputResult={state.celInputResult}
              connector={state.connector}
            />
          )}
        </KibanaPageTemplate.Section>
        <Footer
          isGenerating={state.isGenerating}
          isAnalyzeStep={state.step === 3}
          isAnalyzeCelStep={state.step === celInputStepIndex}
          isLastStep={state.step === deployStepIndex}
          isNextStepEnabled={isNextStepEnabled}
          isNextAddingToElastic={state.step === deployStepIndex - 1}
          onBack={goBackStep}
          onNext={completeStep}
        />
      </KibanaPageTemplate>
    </ActionsProvider>
  );
});
CreateIntegrationAssistant.displayName = 'CreateIntegrationAssistant';
