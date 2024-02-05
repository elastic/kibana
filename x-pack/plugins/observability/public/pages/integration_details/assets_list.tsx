/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiListGroup, EuiListGroupItemProps, EuiLoadingSpinner } from '@elastic/eui';
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
  filter,
  timeRange,
}: {
  asset: AssetSpecification;
  integrationName: string;
  filter: string;
  timeRange: {
    from: string;
    to: string;
  };
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
    async function fetchAssets() {
      const query = {
        indexPattern: `metrics-${integrationName}*`,
        identifierField: assetSpecification.identifier_field,
        from: timeRange.from,
        to: timeRange.to,
      };

      if (assetSpecification.display_name_field) {
        (query as GetResolveAssetsQueryParams).displayNameField =
          assetSpecification.display_name_field;
      }

      if (filter.length !== 0) {
        (query as GetResolveAssetsQueryParams).filter = filter;
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

    fetchAssets();
  }, [http, assetSpecification, integrationName, filter, timeRange]);

  if (assetsLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (assets.length === 0) {
    return (
      <span>
        {i18n.translate('xpack.observability.assetsList.span.noAssetsFoundLabel', {
          defaultMessage: 'No assets found',
        })}
      </span>
    );
  }

  const listItems: EuiListGroupItemProps[] = assets.map((asset) => ({
    iconType: 'dashboardApp',
    label: asset.display_name ? asset.display_name : asset.id,
    href: dashboardAppLocator?.getRedirectUrl({
      dashboardId: assetSpecification.details_dashboard_id,
      query: {
        language: 'kql',
        query: `${assetSpecification.identifier_field}:"${asset.id}" `,
      },
    }),
  }));

  return <EuiListGroup color="primary" listItems={listItems} />;
}
