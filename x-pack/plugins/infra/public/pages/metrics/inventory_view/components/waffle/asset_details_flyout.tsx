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
  currentTime: number;
  options?: InfraWaffleMapOptions;
}

const ONE_HOUR = 60 * 60 * 1000;

const flyoutTabs = [
  ...commonFlyoutTabs,
  {
    id: ContentTabIds.LINK_TO_APM,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.linkToApm', {
      defaultMessage: 'APM',
    }),
  },
];

export const AssetDetailsFlyout = ({
  assetName,
  assetType,
  closeFlyout,
  currentTime,
  options,
}: Props) => {
  const { source } = useSourceContext();

  return source ? (
    <AssetDetails
      asset={{ id: assetName, name: assetName }}
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
        from: new Date(currentTime - ONE_HOUR).toISOString(),
        to: new Date(currentTime).toISOString(),
      }}
    />
  ) : null;
};
