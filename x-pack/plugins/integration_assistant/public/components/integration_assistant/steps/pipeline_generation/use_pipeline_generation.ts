/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect } from 'react';
import { IntegrationSettings } from '../../types';
import { runCategorizationGraph, runEcsGraph, runIntegrationBuilder, runRelatedGraph } from './api';

interface PipelineGenerationProps {
  integrationSettings: IntegrationSettings | undefined;
}

export const progressOrder = [
  'ecs',
  'categorization',
  'related_graph',
  'integration_builder',
  'done',
] as const;
export type Progress = typeof progressOrder[number];

interface Parameters {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
}
interface ParametersWithPipeline extends Parameters {
  currentPipeline: object;
}

export const usePipelineGeneration = ({ integrationSettings }: PipelineGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<null | string>(null);

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
        };
        setProgress('ecs');
        const ecsGraphResult = await runEcsGraph(parameters, deps);
        console.log({ ecsGraphResult });
        if (abortController.signal.aborted) return;
        if (isEmpty(ecsGraphResult?.results)) {
          setError('No results from ECS graph');
          return;
        }

        const parametersWithPipeline: ParametersWithPipeline = {
          ...parameters,
          currentPipeline: ecsGraphResult.results.pipeline,
        };

        setProgress('categorization');
        const categorizationResult = await runCategorizationGraph(parametersWithPipeline, deps);
        console.log({ categorizationResult });
        if (abortController.signal.aborted) return;
        if (!isEmpty(categorizationResult?.results)) {
          parametersWithPipeline.currentPipeline = categorizationResult.results.pipeline;
        }

        // setProgress('related_graph');
        // const relatedGraphResult = await runRelatedGraph(parametersWithPipeline, deps);
        // console.log({ relatedGraphResult });
        // if (abortController.signal.aborted) return;
        // if (!isEmpty(relatedGraphResult?.results)) {
        //   parametersWithPipeline.currentPipeline = relatedGraphResult.results.pipeline;
        // }

        // setProgress('integration_builder');
        // const integrationBuilderResult = await runIntegrationBuilder(parametersWithPipeline, deps);
        // console.log({ integrationBuilderResult });
        // if (abortController.signal.aborted) return;

        // setResult
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`An error occurred: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      console.log('aborting');
      abortController.abort();
    };
  }, [http, integrationSettings, notifications?.toasts]);

  return {
    result,
    isLoading,
    progress,
    error,
  };
};
