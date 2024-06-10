/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect } from 'react';
import type { CheckPipelineApiRequest, Pipeline } from '../../../../../../common';
import type { Actions, State } from '../../state';
import { runCheckPipelineResults } from '../../../../../common/lib/api';

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
