/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { XJsonLang } from '@kbn/monaco';
// import { JsonEditor } from '@kbn/es-ui-shared-plugin/public';
import React, { useCallback, useState } from 'react';
import type { Pipeline } from '../../../../../common';
import type { Actions, State } from '../../state';
import { FieldsTable } from './fields_table';
import type { ProgressItem } from './use_pipeline_generation';
import { useCheckPipeline, usePipelineGeneration } from './use_pipeline_generation';

interface PipelineGenerationProps {
  integrationSettings: State['integrationSettings'];
  connectorId: State['connectorId'];
  result: State['result'];
  isGenerating: State['isGenerating'];
  setIntegrationSettings: Actions['setIntegrationSettings'];
  setIsGenerating: Actions['setIsGenerating'];
  setResult: Actions['setResult'];
}

const progressText: Record<ProgressItem, string> = {
  ecs: 'Mapping ECS',
  categorization: 'Categorization',
  related_graph: 'Generating related graph',
  integration_builder: 'Building integration',
};

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
  }
`;

export const PipelineGeneration = React.memo<PipelineGenerationProps>(
  ({ integrationSettings, connectorId, isGenerating, result, setIsGenerating, setResult }) => {
    const [customPipeline, setCustomPipeline] = useState<Pipeline>();
    const { progress, error } = usePipelineGeneration({
      integrationSettings,
      connectorId,
      skip: result != null,
      setResult,
      setIsGenerating,
    });

    const { error: checkPipelineError } = useCheckPipeline({
      customPipeline,
      integrationSettings,
      connectorId,
      setResult,
      setIsGenerating,
    });

    const [isPipelineEditionVisible, setIsPipelineEditionVisible] = useState(false);
    const [updatedPipeline, setUpdatedPipeline] = useState<string>();

    const changeCustomPipeline = useCallback((value: string) => {
      setUpdatedPipeline(value);
    }, []);

    const saveCustomPipeline = useCallback(() => {
      if (updatedPipeline) {
        try {
          const pipeline = JSON.parse(updatedPipeline);
          setCustomPipeline(pipeline);
        } catch (e) {
          // errors are already displayed in the code editor
        }
      }
      setIsPipelineEditionVisible(false);
    }, [updatedPipeline]);

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" direction="row">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h6>{'View Results'}</h6>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => setIsPipelineEditionVisible(true)}>
                {'Edit pipeline'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {(isGenerating || error) && (
            <>
              <EuiProgress value={progress.length - 1} max={4} size="l" />
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="s">
                {progress.map((item, index) => (
                  <EuiFlexItem key={index}>
                    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                      {progress.length - 1 === index ? (
                        <EuiFlexItem grow={false} css={{ width: '16px' }}>
                          {error ? (
                            <EuiIcon type="cross" color="danger" />
                          ) : (
                            <EuiLoadingSpinner size="s" />
                          )}
                        </EuiFlexItem>
                      ) : (
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="check" color="success" />
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>{progressText[item]}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
                <EuiSpacer size="m" />
                {error && <>{error}</>}
              </EuiFlexGroup>
            </>
          )}
          {result && (
            <>
              {isGenerating ? (
                <EuiLoadingSpinner size="l" />
              ) : (
                <FieldsTable documents={result.docs} />
              )}
              <EuiSpacer size="m" />
              {isPipelineEditionVisible && (
                <EuiFlyout onClose={() => setIsPipelineEditionVisible(false)}>
                  <EuiFlyoutHeader hasBorder>
                    <EuiTitle size="s">
                      <h2>{'Ingest Pipeline'}</h2>
                    </EuiTitle>
                  </EuiFlyoutHeader>
                  <EuiFlyoutBody css={flyoutBodyCss}>
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      wrap={false}
                      responsive={false}
                      css={{ height: '100%' }}
                    >
                      <EuiFlexItem grow={true} data-test-subj="inspectorRequestCodeViewerContainer">
                        <CodeEditor
                          languageId={XJsonLang.ID}
                          value={JSON.stringify(result.pipeline, null, 2)}
                          onChange={changeCustomPipeline}
                          width="100%"
                          height="100%"
                          options={{
                            fontSize: 12,
                            minimap: { enabled: true },
                            folding: true,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            wrappingIndent: 'indent',
                            automaticLayout: true,
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutBody>
                  <EuiFlyoutFooter>
                    <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <EuiButton fill onClick={saveCustomPipeline}>
                          {'Save'}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlyoutFooter>
                </EuiFlyout>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PipelineGeneration.displayName = 'PipelineGeneration';
