/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItemProps,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import {
  Asset,
  AssetSpecification,
  GetResolveAssetsQueryParams,
} from '../../../common/integrations';
import { useKibana } from '../../utils/kibana_react';

export function AssetsList({
  asset: assetSpecification,
  integrationName,
}: {
  asset: AssetSpecification;
  integrationName: string;
}) {
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);

  const {
    services: {
      http,
      dashboard: { locator: dashboardAppLocator },
    },
  } = useKibana();

  useEffect(() => {
    async function fetchInstalledIntegrations() {
      const query = {
        indexPattern: `metrics-${integrationName}*`,
        identifierField: assetSpecification.identifier_field,
      };

      if (assetSpecification.display_name_field) {
        (query as GetResolveAssetsQueryParams).displayNameField =
          assetSpecification.display_name_field;
      }

      const response = await http.get<{ assets: Asset[] }>(
        '/api/observability/integrations/resolve_assets',
        {
          query,
        }
      );
      setAssets(response.assets);
      setAssetsLoading(false);
    }

    fetchInstalledIntegrations();
  }, [http, assetSpecification, integrationName]);

  const listItems: EuiListGroupItemProps[] = assets.map((asset) => ({
    label: asset.display_name ? asset.display_name : asset.id,
    href: dashboardAppLocator?.getRedirectUrl({
      dashboardId: assetSpecification.details_dashboard_id,
      query: {
        language: 'kql',
        query: `${assetSpecification.identifier_field}:"${asset.id}" `,
      },
    }),
  }));

  if (assetsLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return (
    <EuiFlexItem>
      <EuiPanel color="transparent" paddingSize="none">
        <EuiTitle size="s" css={{ marginBottom: '8px' }}>
          <h3>{assetSpecification.display_name}</h3>
        </EuiTitle>
        {/* Maybe here I should have a link (fake?) to an overview dashboard for this asset type */}
        <EuiListGroup color="primary" listItems={listItems} />
      </EuiPanel>
    </EuiFlexItem>
  );
}
