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
import { HostFlyout, useHostFlyoutUrlState } from '../../hooks/use_host_flyout_url_state';
import { AssetDetails } from '../../../../../components/asset_details/asset_details';
import { orderedFlyoutTabs } from './tabs';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

export const FlyoutWrapper = ({ node: { name }, closeFlyout }: Props) => {
  const { source } = useSourceContext();
  const { parsedDateRange } = useUnifiedSearchContext();
  const [hostFlyoutState, setHostFlyoutState] = useHostFlyoutUrlState();

  return source ? (
    <AssetDetails
      asset={{ id: name, name }}
      assetType="host"
      dateRange={parsedDateRange}
      activeTabId={hostFlyoutState?.tabId}
      overrides={{
        metadata: {
          query: hostFlyoutState?.metadataSearch,
          showActionsColumn: true,
        },
        processes: {
          query: hostFlyoutState?.processSearch,
        },
        logs: {
          query: hostFlyoutState?.logsSearch,
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
      metricAlias={source.configuration.metricAlias}
    />
  ) : null;
};
