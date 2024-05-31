/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect, useCallback } from 'react';
import { IntegrationSettings } from '../../types';
import { runCategorizationGraph, runEcsGraph, runIntegrationBuilder, runRelatedGraph } from './api';

interface PipelineGenerationProps {
  integrationSettings: IntegrationSettings | undefined;
  connectorId: string | undefined;
}

export type ProgressItem = 'ecs' | 'categorization' | 'related_graph' | 'integration_builder';

interface Parameters {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  connectorId?: string;
}
interface ParametersWithPipeline extends Parameters {
  currentPipeline: object;
}

export const usePipelineGeneration = ({
  integrationSettings,
  connectorId,
}: PipelineGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [result, setResult] = useState<object | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<null | string>(null);

  const addProgress = useCallback(
    (item: ProgressItem) => {
      setProgress((prev) => [...prev, item]);
    },
    [setProgress]
  );

  useEffect(() => {
    if (http == null || integrationSettings == null || notifications?.toasts == null) {
      return;
    }
    setIsLoading(true);
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const parameters: Parameters = {
          packageName: integrationSettings.name ?? '',
          dataStreamName: integrationSettings.dataStreamName ?? '',
          rawSamples: integrationSettings.logsSampleParsed ?? [],
          connectorId,
        };
        addProgress('ecs');
        const ecsGraphResult = await runEcsGraph(parameters, deps);
        if (abortController.signal.aborted) return;
        if (isEmpty(ecsGraphResult?.results)) {
          setError('No results from ECS graph');
          return;
        }

        const parametersWithPipeline: ParametersWithPipeline = {
          ...parameters,
          currentPipeline: ecsGraphResult.results.pipeline,
        };

        addProgress('categorization');
        const categorizationResult = await runCategorizationGraph(parametersWithPipeline, deps);
        if (abortController.signal.aborted) return;
        if (!isEmpty(categorizationResult?.results)) {
          parametersWithPipeline.currentPipeline = categorizationResult.results.pipeline;
        }

        // addProgress('related_graph');
        // const relatedGraphResult = await runRelatedGraph(parametersWithPipeline, deps);
        // if (abortController.signal.aborted) return;
        // if (!isEmpty(relatedGraphResult?.results)) {
        //   parametersWithPipeline.currentPipeline = relatedGraphResult.results.pipeline;
        // }

        // addProgress('integration_builder');
        // const integrationBuilderResult = await runIntegrationBuilder(parametersWithPipeline, deps);
        // if (abortController.signal.aborted) return;

        // setResult
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      console.log('aborting');
      abortController.abort();
    };
  }, [addProgress, connectorId, http, integrationSettings, notifications?.toasts]);

  return {
    result,
    isLoading,
    progress,
    error,
  };
};
