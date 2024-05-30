/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiProgress, EuiText } from '@elastic/eui';
// import { JsonEditor } from '@kbn/es-ui-shared-plugin/public';
import React, { useEffect, useMemo } from 'react';
import { IntegrationSettings } from '../../types';
import { usePipelineGeneration, progressOrder } from './use_pipeline_generation';

interface PipelineGenerationProps {
  integrationSettings: IntegrationSettings | undefined;
  setIntegrationSettings: (param: IntegrationSettings) => void;
  setIsGenerating: (param: boolean) => void;
}

export const PipelineGeneration = React.memo<PipelineGenerationProps>(
  ({ integrationSettings, setIsGenerating }) => {
    const { isLoading, progress, error, result } = usePipelineGeneration({ integrationSettings });

    useEffect(() => {
      setIsGenerating(isLoading);
    }, [setIsGenerating, isLoading]);

    const progressLog = useMemo(() => {
      const log = [];
      switch (progress) {
        case 'integration_builder':
          log.push(`Building integration${progress !== 'integration_builder' ? ' (done)' : '...'}`);
        case 'related_graph':
          log.push(`Generating related graph${progress !== 'related_graph' ? ' (done)' : '...'}`);
        case 'categorization':
          log.push(`Categorizing${progress !== 'categorization' ? ' (done)' : '...'}`);
        case 'ecs':
          log.push(`Mapping ECS${progress !== 'ecs' ? ' (done)' : '...'}`);
      }
      return log.reverse();
    }, [progress]);

    //   return <JsonEditor value={pipeline} onUpdate={() => {}} />;

    return (
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          {progress && (
            <>
              <EuiProgress value={progressOrder.indexOf(progress) + 1} max={4} size="m" />
              <EuiFlexGroup direction="column" gutterSize="s">
                {progressLog.map((log, idx) => (
                  <EuiFlexItem key={idx}>
                    <EuiText>{log}</EuiText>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}
          {isLoading && <EuiLoadingSpinner size="s" />}
          {error && <>{error}</>}
          {result && <>{result}</>}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PipelineGeneration.displayName = 'PipelineGeneration';
