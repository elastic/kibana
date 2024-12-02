/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useActions, type State } from '../../../../state';
import type { OnComplete } from './generation_modal';
import { GenerationModal } from './generation_modal';
import { ApiDefinitionInput } from './api_definition_input';
import * as i18n from './translations';
import * as il8n_ds from '../../../../steps/data_stream_step/translations';
import type { CelFlyoutStepName } from '../../create_cel_config';

interface CelInputStepProps {
  integrationSettings: State['integrationSettings'];
  connector: State['connector'];
  isFlyoutGenerating: State['isFlyoutGenerating'];
  setCelStep: (step: CelFlyoutStepName) => void;
  setSuggestedPaths: (paths: string[]) => void;
}

export const CelInputStep = React.memo<CelInputStepProps>(
  ({ integrationSettings, connector, isFlyoutGenerating, setCelStep, setSuggestedPaths }) => {
    const { setIntegrationSettings, setIsFlyoutGenerating } = useActions();

    const onGenerationCompleted = useCallback<OnComplete>(
      (result: string[]) => {
        if (result) {
          setSuggestedPaths(result);
          setIsFlyoutGenerating(false);
          setCelStep('confirm_details');
        }
      },
      [setCelStep, setIsFlyoutGenerating, setSuggestedPaths]
    );
    const onGenerationClosed = useCallback(() => {
      setIsFlyoutGenerating(false); // aborts generation
    }, [setIsFlyoutGenerating]);

    const [dataStreamTitle, setDataStreamTitle] = useState<string>(
      integrationSettings?.dataStreamTitle ?? ''
    );

    const onChangeDataStreamName = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDataStreamName = e.target.value;
        setDataStreamTitle(nextDataStreamName);
        setIntegrationSettings({ ...integrationSettings, dataStreamTitle: nextDataStreamName });
      },
      [setIntegrationSettings, integrationSettings]
    );

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="celInputStep">
        <EuiFlexItem fullWidth>
          <EuiPanel hasShadow={false} hasBorder={false}>
            <EuiTitle size="s">
              <h2>{i18n.API_DEFINITION_TITLE}</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={il8n_ds.DATA_STREAM_TITLE_LABEL}
              isInvalid={dataStreamTitle === ''}
              error={[i18n.DATA_STREAM_TITLE_REQUIRED]}
            >
              <EuiFieldText
                fullWidth
                name="dataStreamTitle"
                data-test-subj="dataStreamTitleInput"
                value={dataStreamTitle}
                onChange={onChangeDataStreamName}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <ApiDefinitionInput integrationSettings={integrationSettings} isGenerating={false} />
          </EuiPanel>
          {isFlyoutGenerating && (
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
