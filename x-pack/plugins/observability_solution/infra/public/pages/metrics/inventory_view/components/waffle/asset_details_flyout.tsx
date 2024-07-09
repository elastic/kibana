/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraWaffleMapOptions } from '../../../../../lib/lib';
import { AssetDetails } from '../../../../../components/asset_details';
import { getAssetDetailsFlyoutTabs } from '../../../../../common/asset_details_config/asset_details_tabs';

interface Props {
  assetName?: string;
  assetId: string;
  assetType: InventoryItemType;
  closeFlyout: () => void;
  currentTime: number;
  options?: Pick<InfraWaffleMapOptions, 'groupBy' | 'metric'>;
  isAutoReloading?: boolean;
  refreshInterval?: number;
}

const ONE_HOUR = 60 * 60 * 1000;

export const AssetDetailsFlyout = ({
  assetName,
  assetId,
  assetType,
  closeFlyout,
  currentTime,
  options,
  refreshInterval,
  isAutoReloading = false,
}: Props) => {
  const dateRange = useMemo(() => {
    // forces relative dates when auto-refresh is active
    return isAutoReloading
      ? {
          from: 'now-1h',
          to: 'now',
        }
      : {
          from: new Date(currentTime - ONE_HOUR).toISOString(),
          to: new Date(currentTime).toISOString(),
        };
  }, [currentTime, isAutoReloading]);

  return (
    <AssetDetails
      assetId={assetId}
      assetName={assetName}
      assetType={assetType}
      overrides={{
        metadata: {
          showActionsColumn: false,
        },
        alertRule: {
          options,
        },
      }}
      tabs={getAssetDetailsFlyoutTabs(assetType)}
      links={['nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      dateRange={dateRange}
      autoRefresh={{
        isPaused: !isAutoReloading,
        interval: refreshInterval,
      }}
    />
  );
};
