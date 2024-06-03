/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
// import { JsonEditor } from '@kbn/es-ui-shared-plugin/public';
import React from 'react';
import { Actions, AssistantState } from '../../hooks/use_assistant_state';
import { FieldsTable } from './fields_table';
import { ProgressItem, usePipelineGeneration } from './use_pipeline_generation';

interface PipelineGenerationProps {
  integrationSettings: AssistantState['integrationSettings'];
  connectorId: AssistantState['connectorId'];
  result: AssistantState['result'];
  isGenerating: AssistantState['isGenerating'];
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

export const PipelineGeneration = React.memo<PipelineGenerationProps>(
  ({ integrationSettings, connectorId, isGenerating, result, setIsGenerating, setResult }) => {
    const { progress, error } = usePipelineGeneration({
      integrationSettings,
      connectorId,
      skip: result != null,
      isGenerating,
      setResult,
      setIsGenerating,
    });

    // useEffect(() => {
    //   setIsGenerating(isLoading);
    // }, [setIsGenerating, isLoading]);

    // useEffect(() => {
    //   console.log('pipeline', result?.pipeline);
    //   console.log('docs', result?.docs);
    //   setResult(result);
    // }, [setResult, result]);

    //   return <JsonEditor value={result} onUpdate={() => {}} />;

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
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
              <FieldsTable documents={result.docs} />
              <EuiSpacer size="m" />
              <CodeEditor
                value={JSON.stringify(result.pipeline, null, 2)}
                languageId="json"
                onChange={() => {}}
                width="100%"
                height={400}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PipelineGeneration.displayName = 'PipelineGeneration';
