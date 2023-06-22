/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { HostFlyout, useHostFlyoutUrlState } from '../../hooks/use_host_flyout_url_state';
import { AssetDetails } from '../../../../../components/asset_details/asset_details';
import { metadataTab, processesTab } from './tabs';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

const NODE_TYPE = 'host' as InventoryItemType;

export const FlyoutWrapper = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const currentTimeRange = useMemo(
    () => ({
      ...getDateRangeAsTimestamp(),
      interval: '1m',
    }),
    [getDateRangeAsTimestamp]
  );

  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutUrlState();

  return (
    <AssetDetails
      node={node}
      nodeType={NODE_TYPE}
      currentTimeRange={currentTimeRange}
      activeTabId={hostFlyoutOpen?.selectedTabId}
      overrides={{
        metadata: {
          query: hostFlyoutOpen?.metadataSearch,
          showActionsColumn: true,
        },
        processes: {
          query: hostFlyoutOpen?.processSearch,
        },
      }}
      onTabsStateChange={(state) =>
        setHostFlyoutOpen({
          metadataSearch: state.metadata?.query,
          processSearch: state.processes?.query,
          selectedTabId: state.activeTabId as HostFlyout['selectedTabId'],
        })
      }
      tabs={[metadataTab, processesTab]}
      links={['apmServices', 'uptime']}
      renderMode={{
        showInFlyout: true,
        closeFlyout,
      }}
    />
  );
};
