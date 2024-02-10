/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Asset,
  GetResolveAssetsQueryParams,
  Integration,
} from '@kbn/observability-plugin/common/integrations';
import React, { useEffect, useState, useMemo } from 'react';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';

export function IntegrationContainer() {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    services: { http },
  } = useKibanaContextForPlugin();

  const { nodeType } = useWaffleOptionsContext();
  const { currentTimeRange } = useWaffleTimeContext();

  const [integrationName, assetName] = useMemo(() => nodeType.split(':'), [nodeType]);

  useEffect(() => {
    async function fetchIntegration() {
      setIsLoading(true);

      const response = await http.get<{ integration: Integration }>(
        `/api/observability/integrations/${integrationName}`
      );
      setIntegration(response.integration);

      const assetSpecification = response.integration.metadata.assets.find(
        (asset) => asset.display_name.replaceAll(' ', '_').toLowerCase() === assetName
      );

      if (!assetSpecification) {
        throw new Error(`Failed to find asset ${assetName} in integration ${integrationName}`);
      }

      // Should read from source config here to understand remote cluster patterns
      const query = {
        indexPattern: `metrics-${integrationName}*`,
        identifierField: assetSpecification.identifier_field,
        from: currentTimeRange.from,
        to: currentTimeRange.to,
      };

      if (assetSpecification.display_name_field) {
        (query as GetResolveAssetsQueryParams).displayNameField =
          assetSpecification.display_name_field;
      }

      // Need to update endpoint to support passing a full KQL filter expression

      const assetsResponse = await http.get<{ assets: Asset[] }>(
        '/api/observability/integrations/resolve_assets',
        {
          query,
        }
      );

      setAssets(assetsResponse.assets);
      setIsLoading(false);
    }

    fetchIntegration();
  }, [http, assetName, integrationName, currentTimeRange]);

  if (isLoading) {
    return (
      <InfraLoadingPanel
        height="100%"
        width="100%"
        text={i18n.translate('xpack.infra.integrations.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  }

  // No data screen

  return (
    <div>
      {assets.map((asset) => (
        <div key={asset.id}>{asset.display_name}</div>
      ))}
    </div>
  );
}
