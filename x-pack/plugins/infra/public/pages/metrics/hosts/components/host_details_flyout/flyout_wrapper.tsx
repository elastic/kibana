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
import { orderedFlyoutTabs } from './tabs';
import { useLogViewReference } from '../../hooks/use_log_view_reference';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

const NODE_TYPE = 'host' as InventoryItemType;

export const FlyoutWrapper = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { logViewReference, loading } = useLogViewReference({
    id: 'hosts-flyout-logs-view',
  });
  const currentTimeRange = useMemo(
    () => ({
      ...getDateRangeAsTimestamp(),
      interval: '1m',
    }),
    [getDateRangeAsTimestamp]
  );

  const [hostFlyoutState, setHostFlyoutState] = useHostFlyoutUrlState();

  return (
    <AssetDetails
      node={node}
      nodeType={NODE_TYPE}
      currentTimeRange={currentTimeRange}
      activeTabId={hostFlyoutState?.tabId}
      overrides={{
        overview: {
          dateRange: searchCriteria.dateRange,
          dataView,
        },
        metadata: {
          query: hostFlyoutState?.metadataSearch,
          showActionsColumn: true,
        },
        processes: {
          query: hostFlyoutState?.processSearch,
        },
        logs: {
          query: hostFlyoutState?.logsSearch,
          logView: {
            reference: logViewReference,
            loading,
          },
        },
      }}
      onTabsStateChange={(state) =>
        setHostFlyoutState({
          metadataSearch: state.metadata?.query,
          processSearch: state.processes?.query,
          logsSearch: state.logs?.query,
          tabId: state.activeTabId as HostFlyout['tabId'],
        })
      }
      tabs={orderedFlyoutTabs}
      links={['apmServices', 'nodeDetails']}
      renderMode={{
        showInFlyout: true,
        closeFlyout,
      }}
    />
  );
};
