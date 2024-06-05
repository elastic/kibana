/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect, useCallback } from 'react';
import type { CheckPipelineApiRequest, Pipeline } from '../../../../../../common';
import type { Actions, State } from '../../state';
import {
  runCategorizationGraph,
  runCheckPipelineResults,
  runEcsGraph,
  runRelatedGraph,
} from './api';

export type ProgressItem = 'ecs' | 'categorization' | 'related_graph' | 'integration_builder';

interface Parameters {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  connectorId?: string;
}
interface ParametersWithPipeline extends Parameters {
  currentPipeline: Pipeline;
}

interface PipelineGenerationProps {
  integrationSettings: State['integrationSettings'];
  connectorId: State['connectorId'];
  skip: boolean;
  setIsGenerating: Actions['setIsGenerating'];
  setResult: Actions['setResult'];
}

export const usePipelineGeneration = ({
  integrationSettings,
  connectorId,
  skip,
  setIsGenerating,
  setResult,
}: PipelineGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<null | string>(null);

  const addProgress = useCallback(
    (item: ProgressItem) => {
      setProgress((prev) => [...prev, item]);
    },
    [setProgress]
  );

  useEffect(() => {
    if (skip || http == null || integrationSettings == null || notifications?.toasts == null) {
      return;
    }
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
        setIsGenerating(true);

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

        addProgress('related_graph');
        const relatedGraphResult = await runRelatedGraph(parametersWithPipeline, deps);
        if (abortController.signal.aborted) return;
        if (!isEmpty(relatedGraphResult?.results)) {
          // parametersWithPipeline.currentPipeline = relatedGraphResult.results.pipeline;
          setResult(relatedGraphResult.results);
        }
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.message}`);
      } finally {
        setIsGenerating(false);
      }
    })();
    return () => {
      abortController.abort();
    };
  }, [
    skip,
    setIsGenerating,
    addProgress,
    connectorId,
    http,
    integrationSettings,
    notifications?.toasts,
    setResult,
  ]);

  return {
    progress,
    error,
  };
};

interface CheckPipelineProps {
  integrationSettings: State['integrationSettings'];
  connectorId: State['connectorId'];
  customPipeline: Pipeline | undefined;
  setIsGenerating: Actions['setIsGenerating'];
  setResult: Actions['setResult'];
}

export const useCheckPipeline = ({
  integrationSettings,
  connectorId,
  customPipeline,
  setIsGenerating,
  setResult,
}: CheckPipelineProps) => {
  const { http, notifications } = useKibana().services;
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    if (
      customPipeline == null ||
      http == null ||
      integrationSettings == null ||
      notifications?.toasts == null
    ) {
      return;
    }
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const parameters: CheckPipelineApiRequest = {
          pipeline: customPipeline,
          rawSamples: integrationSettings.logsSampleParsed ?? [],
        };
        setIsGenerating(true);

        const ecsGraphResult = await runCheckPipelineResults(parameters, deps);
        if (abortController.signal.aborted) return;
        if (isEmpty(ecsGraphResult?.pipelineResults) || ecsGraphResult?.errors?.length) {
          setError('No results for the pipeline');
          return;
        }
        setResult({
          pipeline: customPipeline,
          docs: ecsGraphResult.pipelineResults,
        });
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.message}`);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [
    setIsGenerating,
    connectorId,
    http,
    integrationSettings,
    notifications?.toasts,
    setResult,
    customPipeline,
  ]);

  return { error };
};
