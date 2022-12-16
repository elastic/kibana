/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiCode,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { TestPipelineLogic } from './test_pipeline_logic';

import './add_inference_pipeline_flyout.scss';

export const TestPipeline: React.FC = () => {
  const {
    addInferencePipelineModal: {
      configuration: { sourceField },
      indexName,
    },
    getDocumentsErr,
    isGetDocumentsLoading,
    showGetDocumentErrors,
    simulateBody,
    simulatePipelineResult,
    simulatePipelineErrors,
  } = useValues(TestPipelineLogic);
  const { simulatePipeline, setPipelineSimulateBody, makeGetDocumentRequest } =
    useActions(TestPipelineLogic);

  const isSmallerViewport = useIsWithinMaxBreakpoint('s');
  const inputRef = useRef<HTMLInputElement>();

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>
              <h4>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.title',
                  { defaultMessage: 'Review pipeline results (optional)' }
                )}
              </h4>
            </EuiText>
            <EuiSpacer />
            <EuiText>
              <h5>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.subtitle',
                  { defaultMessage: 'Documents' }
                )}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument',
                { defaultMessage: 'Add document' }
              )}
              helpText={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument.helptext',
                { defaultMessage: 'Test with a document from your index' }
              )}
              isInvalid={showGetDocumentErrors}
              error={getDocumentsErr}
            >
              <EuiFieldText
                prepend={i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.addDocument.documentId',
                  { defaultMessage: 'Document ID' }
                )}
                inputRef={(ref: HTMLInputElement) => {
                  inputRef.current = ref;
                }}
                isInvalid={showGetDocumentErrors}
                isLoading={isGetDocumentsLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputRef.current?.value.trim().length !== 0) {
                    makeGetDocumentRequest({
                      documentId: inputRef.current?.value.trim() ?? '',
                      indexName,
                    });
                  }
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
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
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.description',
                  {
                    defaultMessage:
                      'You can simulate your pipeline results by passing an array of documents.',
                  }
                )}
                <br />
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.test.example.code"
                  defaultMessage="Use JSON format: {code}"
                  values={{
                    code: (
                      <EuiCode>{`[{"_index":"index","_id":"id","_source":{"${sourceField}":"bar"}}]`}</EuiCode>
                    ),
                  }}
                />
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
