/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { InfraWaffleMapOptions } from '../../../../../lib/lib';
import { ContentTabIds } from '../../../../../components/asset_details/types';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import AssetDetails from '../../../../../components/asset_details/asset_details';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { commonFlyoutTabs } from '../../../../../common/asset_details_config/asset_details_tabs';

interface Props {
  assetName: string;
  assetType: InventoryItemType;
  closeFlyout: () => void;
  options?: Pick<InfraWaffleMapOptions, 'groupBy' | 'metric'>;
  isAutoReloading?: boolean;
  refreshInterval?: number;
}

const flyoutTabs = [
  ...commonFlyoutTabs,
  {
    id: ContentTabIds.LINK_TO_APM,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.linkToApm', {
      defaultMessage: 'APM',
    }),
  },
];

const AUTO_REFRESH_INTERVAL = 60 * 1000;

export const AssetDetailsFlyout = ({
  assetName,
  assetType,
  closeFlyout,
  options,
  isAutoReloading = false,
  refreshInterval = AUTO_REFRESH_INTERVAL,
}: Props) => {
  const { source } = useSourceContext();

  return source ? (
    <AssetDetails
      assetId={assetName}
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
      tabs={flyoutTabs}
      links={['nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      metricAlias={source.configuration.metricAlias}
      dateRange={{
        from: 'now-1h',
        to: 'now',
      }}
      autoRefresh={{
        isPaused: !isAutoReloading,
        interval: refreshInterval,
      }}
    />
  ) : null;
};
