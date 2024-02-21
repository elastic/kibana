/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { AssetDetails } from '../../../../../components/asset_details/asset_details';
import { commonFlyoutTabs } from '../../../../../common/asset_details_config/asset_details_tabs';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useMetricsDataViewContext } from '../../hooks/use_metrics_data_view';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

export const FlyoutWrapper = ({ node: { name }, closeFlyout }: Props) => {
  const { metricAlias } = useMetricsDataViewContext();
  const { searchCriteria } = useHostsViewContext();

  return (
    <AssetDetails
      assetId={name}
      assetName={name}
      assetType="host"
      dateRange={searchCriteria.isoTimeRange}
      overrides={{
        metadata: {
          showActionsColumn: true,
        },
      }}
      tabs={commonFlyoutTabs}
      links={['nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      metricAlias={metricAlias}
    />
  );
};
