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
// import { JsonEditor } from '@kbn/es-ui-shared-plugin/public';
import React, { useEffect } from 'react';
import { IntegrationSettings } from '../../types';
import { ProgressItem, usePipelineGeneration } from './use_pipeline_generation';

interface PipelineGenerationProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
  setIsGenerating: (param: boolean) => void;
}

const progressText: Record<ProgressItem, string> = {
  ecs: 'Mapping ECS',
  categorization: 'Categorization',
  related_graph: 'Generating related graph',
  integration_builder: 'Building integration',
};

export const PipelineGeneration = React.memo<PipelineGenerationProps>(
  ({ integrationSettings, setIsGenerating }) => {
    const { isLoading, progress, error, result } = usePipelineGeneration({ integrationSettings });

    useEffect(() => {
      setIsGenerating(isLoading);
    }, [setIsGenerating, isLoading]);

    //   return <JsonEditor value={result} onUpdate={() => {}} />;

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          {(isLoading || error) && (
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
          {result && <>{result}</>}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PipelineGeneration.displayName = 'PipelineGeneration';
