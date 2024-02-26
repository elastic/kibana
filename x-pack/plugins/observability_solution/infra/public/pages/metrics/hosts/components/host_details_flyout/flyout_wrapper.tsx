/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { AssetDetails } from '../../../../../components/asset_details';
import { commonFlyoutTabs } from '../../../../../common/asset_details_config/asset_details_tabs';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

export const FlyoutWrapper = ({ node: { name }, closeFlyout }: Props) => {
  const { source } = useSourceContext();
  const { parsedDateRange } = useUnifiedSearchContext();

  return source ? (
    <AssetDetails
      assetId={name}
      assetName={name}
      assetType="host"
      dateRange={parsedDateRange}
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
      metricAlias={source.configuration.metricAlias}
    />
  ) : null;
};
