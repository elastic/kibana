/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
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

export const FlyoutWrapper = ({ node, closeFlyout }: Props) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { logViewReference, loading, getLogsDataView } = useLogViewReference({
    id: 'hosts-flyout-logs-view',
  });

  const { value: logsDataView } = useAsync(
    () => getLogsDataView(logViewReference),
    [logViewReference]
  );

  const [hostFlyoutState, setHostFlyoutState] = useHostFlyoutUrlState();

  return (
    <AssetDetails
      asset={node}
      assetType="host"
      dateRange={searchCriteria.dateRange}
      activeTabId={hostFlyoutState?.tabId}
      overrides={{
        overview: {
          logsDataView,
          metricsDataView: dataView,
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
        mode: 'flyout',
        closeFlyout,
      }}
    />
  );
};
