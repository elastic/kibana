/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiCodeBlock,
  EuiResizableContainer,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  useIsWithinMaxBreakpoint,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { MLInferenceLogic } from './ml_inference_logic';

import './add_ml_inference_pipeline_modal.scss';

export const TestPipeline: React.FC = () => {
  const {
    addInferencePipelineModal: { simulateBody },
    simulatePipelineResult,
    simulatePipelineErrors,
  } = useValues(MLInferenceLogic);
  const { simulatePipeline, setPipelineSimulateBody } = useActions(MLInferenceLogic);

  const isSmallerViewport = useIsWithinMaxBreakpoint('s');

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiText>
          <h4>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.title',
              { defaultMessage: 'Review pipeline results (optional)' }
            )}
          </h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiResizableContainer
          direction={isSmallerViewport ? 'vertical' : 'horizontal'}
          className="resizableContainer"
        >
          {(EuiResizablePanel, EuiResizableButton) => (
            <>
              <EuiResizablePanel grow hasBorder initialSize={50} paddingSize="xs">
                <CodeEditor
                  languageId="json"
                  options={{
                    automaticLayout: true,
                    lineNumbers: 'off',
                    tabSize: 2,
                  }}
                  value={simulateBody}
                  onChange={(value) => {
                    setPipelineSimulateBody(value);
                  }}
                />
              </EuiResizablePanel>

              <EuiResizableButton />

              <EuiResizablePanel grow hasBorder initialSize={50} paddingSize="xs">
                <EuiCodeBlock language="json" isCopyable className="reviewCodeBlock">
                  {simulatePipelineErrors.length > 0
                    ? JSON.stringify(simulatePipelineErrors, null, 2)
                    : JSON.stringify(simulatePipelineResult || '', null, 2)}
                </EuiCodeBlock>
              </EuiResizablePanel>
            </>
          )}
        </EuiResizableContainer>
      </EuiFlexItem>
      <EuiSpacer />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs">
          <EuiFlexItem>
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.description',
                  {
                    defaultMessage:
                      'You can simulate your pipeline results by passing an array of documents.',
                  }
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <EuiButton onClick={simulatePipeline}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.runButton',
                  { defaultMessage: 'Simulate Pipeline' }
                )}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
