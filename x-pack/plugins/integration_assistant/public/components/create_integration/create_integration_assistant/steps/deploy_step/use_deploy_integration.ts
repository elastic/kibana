/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import type { BuildIntegrationRequestBody } from '../../../../../../common';
import type { State } from '../../state';
import { runBuildIntegration, runInstallPackage } from '../../../../../common/lib/api';
import { defaultLogoEncoded } from '../default_logo';
import { getIntegrationNameFromResponse } from '../../../../../common/lib/api_parsers';

interface PipelineGenerationProps {
  integrationSettings: State['integrationSettings'];
  result: State['result'];
  connectorId: State['connectorId'];
}

export type ProgressItem = 'build' | 'install';

export const useDeployIntegration = ({ integrationSettings, result }: PipelineGenerationProps) => {
  const { http, notifications } = useKibana().services;
  const [integrationFile, setIntegrationFile] = useState<Blob | null>(null);
  const [integrationName, setIntegrationName] = useState<string>();
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
        const parameters: BuildIntegrationRequestBody = {
          integration: {
            title: integrationSettings.title ?? '',
            description: integrationSettings.description ?? '',
            name: integrationSettings.name ?? '',
            logo: integrationSettings.logo ?? defaultLogoEncoded,
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
        };

        setIsLoading(true);

        const zippedIntegration = await runBuildIntegration(parameters, deps);
        if (abortController.signal.aborted) return;
        setIntegrationFile(zippedIntegration);

        const installResult = await runInstallPackage(zippedIntegration, deps);
        if (abortController.signal.aborted) return;

        const integrationNameFromResponse = getIntegrationNameFromResponse(installResult);
        if (integrationNameFromResponse) {
          setIntegrationName(integrationNameFromResponse);
        } else {
          throw new Error('Integration name not found in response');
        }
      } catch (e) {
        if (abortController.signal.aborted) return;
        setError(`Error: ${e.body?.message ?? e.message}`);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [
    setIntegrationFile,
    http,
    integrationSettings,
    notifications?.toasts,
    result?.docs,
    result?.pipeline,
  ]);

  return {
    isLoading,
    integrationFile,
    integrationName,
    error,
  };
};
