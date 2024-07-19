/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useInterval from 'react-use/lib/useInterval';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { type AssetSOObject, type GetBulkAssetsResponse } from '@kbn/fleet-plugin/common';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { getOnboardingStatus } from './get_onboarding_status';
import { getInstalledIntegrations } from './get_installed_integrations';
import { type ObservabilityOnboardingContextValue } from '../../../plugin';

export const DASHBOARDS = {
  'apache-Logs-Apache-Dashboard': { type: 'logs' },
  'docker-AV4REOpp5NkDleZmzKkE': { type: 'metrics' },
  'nginx-55a9e6e0-a29e-11e7-928f-5dbe6f6f5519': { type: 'logs' },
  'system-79ffd6e0-faa0-11e6-947f-177f697178b8': { type: 'metrics' },
};

export function useOnboardingFlow() {
  const {
    services: { fleet },
  } = useKibana<ObservabilityOnboardingContextValue>();

  // Create onboarding session
  const { data, error, refetch } = useFetcher(
    (callApi) =>
      callApi('POST /internal/observability_onboarding/flow', {
        params: {
          body: {
            name: 'auto-detect',
          },
        },
      }),
    [],
    { showToastOnError: false }
  );

  const onboardingId = data?.onboardingFlow.id;

  // Fetch onboarding progress
  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (onboardingId) {
        return callApi('GET /internal/observability_onboarding/flow/{onboardingId}/progress', {
          params: { path: { onboardingId } },
        });
      }
    },
    [onboardingId]
  );

  const status = getOnboardingStatus(progressData);
  const installedIntegrations = getInstalledIntegrations(progressData);

  // Fetch metadata for installed Kibana assets
  const assetsState = useAsync(async () => {
    if (installedIntegrations.length === 0) {
      return [];
    }
    const assetsMetadata = await fleet.hooks.epm.getBulkAssets({
      assetIds: (
        installedIntegrations
          .map((integration) => integration.kibanaAssets)
          .flat() as AssetSOObject[]
      ).filter((asset) => Object.keys(DASHBOARDS).includes(asset.id)),
    });
    return installedIntegrations.map((integration) => {
      return {
        ...integration,
        // Enrich installed Kibana assets with metadata from Fleet API (e.g. title, description, etc.)
        kibanaAssets: integration.kibanaAssets.reduce<GetBulkAssetsResponse['items']>(
          (acc, asset) => {
            const assetWithMetadata = assetsMetadata.data?.items.find(({ id }) => id === asset.id);
            if (assetWithMetadata) {
              acc.push(assetWithMetadata);
            }
            return acc;
          },
          []
        ),
      };
    });
  }, [installedIntegrations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useInterval(
    refetchProgress,
    progressStatus === FETCH_STATUS.SUCCESS && status !== 'dataReceived' ? 3000 : null
  );

  return {
    data,
    error,
    refetch,
    status,
    installedIntegrations: assetsState.value ?? [],
  };
}
