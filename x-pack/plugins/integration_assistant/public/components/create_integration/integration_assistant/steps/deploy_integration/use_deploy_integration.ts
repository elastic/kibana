/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash/fp';
import { useState, useEffect } from 'react';
import type { BuildIntegrationApiRequest } from '../../../../../../common';
import type { State } from '../../state';
import { runBuildIntegration, runInstallPackage } from './api';

interface PipelineGenerationProps {
  integrationSettings: State['integrationSettings'];
  result: State['result'];
  connectorId: State['connectorId'];
}

export type ProgressItem = 'build' | 'install';

export const useDeployIntegration = ({
  integrationSettings,
  result,
  connectorId,
}: PipelineGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [integrationFile, setIntegrationFile] = useState<Blob | null>(null);
  // const [integrationFile, setIntegrationFile] = useState<Buffer | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    if (
      http == null ||
      integrationSettings == null ||
      notifications?.toasts == null ||
      result?.pipeline == null
    ) {
      return;
    }
    const abortController = new AbortController();
    const deps = { http, abortSignal: abortController.signal };

    (async () => {
      try {
        const parameters: BuildIntegrationApiRequest = {
          integration: {
            title: integrationSettings.title ?? '',
            description: integrationSettings.description ?? '',
            name: integrationSettings.name ?? '',
            // TODO: logo
            dataStreams: [
              {
                title: integrationSettings.dataStreamTitle ?? '',
                description: integrationSettings.dataStreamDescription ?? '',
                name: integrationSettings.dataStreamName ?? '',
                inputTypes: integrationSettings.inputType ? [integrationSettings.inputType] : [],
                rawSamples: integrationSettings.logsSampleParsed ?? [],
                docs: result.docs ?? [],
                pipeline: result.pipeline,
              },
            ],
          },
          connectorId,
        };
        setIsLoading(true);

        const zippedIntegration = await runBuildIntegration(parameters, deps);
        if (abortController.signal.aborted) return;
        if (!zippedIntegration) {
          setError('Not able to build integration.');
          return;
        }
        setIntegrationFile(zippedIntegration);

        const installResult = await runInstallPackage(zippedIntegration, deps);
        if (abortController.signal.aborted) return;

        if (isEmpty(installResult)) {
          setError('Not able to install integration.');
        }
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [
    setIntegrationFile,
    connectorId,
    http,
    integrationSettings,
    notifications?.toasts,
    result?.docs,
    result?.pipeline,
  ]);

  return {
    isLoading,
    integrationFile,
    error,
  };
};
