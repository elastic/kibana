/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiPanel } from '@elastic/eui';
import { StepContentWrapper } from '../step_content_wrapper';
import { useActions, type State } from '../../state';
import type { OnComplete } from './generation_modal';
import { GenerationModal } from './generation_modal';
import { ApiDefinitionInput } from './api_definition_input';

interface CelInputStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isGenerating: State['isGenerating'];
}

export const CelInputStep = React.memo<CelInputStepProps>(
  ({ integrationSettings, connector, isGenerating }) => {
    const { setIsGenerating, setStep, setCelInputResult } = useActions();

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: State['celInputResult']) => {
        if (result) {
          setCelInputResult(result);
          setIsGenerating(false);
          setStep(6);
        }
      },
      [setCelInputResult, setIsGenerating, setStep]
    );
    const onGenerationClosed = useCallback(() => {
      setIsGenerating(false); // aborts generation
    }, [setIsGenerating]);

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="dataStreamStep">
        <EuiFlexItem>
          <StepContentWrapper title={'Title'} subtitle={'Subtitle'}>
            <EuiPanel hasShadow={false} hasBorder>
              <EuiForm component="form" fullWidth>
                <ApiDefinitionInput integrationSettings={integrationSettings} />
              </EuiForm>
            </EuiPanel>
          </StepContentWrapper>
          {isGenerating && (
            <GenerationModal
              integrationSettings={integrationSettings}
              connector={connector}
              onComplete={onGenerationCompleted}
              onClose={onGenerationClosed}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
CelInputStep.displayName = 'CelInputStep';
