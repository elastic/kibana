/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useLazyRef } from '../../../../../hooks/use_lazy_ref';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { FlyoutTabIds, useHostFlyoutOpen } from '../../hooks/use_host_flyout_open_url_state';
import { Flyout } from './flyout';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

export interface Tab {
  id: FlyoutTabIds.METADATA | FlyoutTabIds.PROCESSES;
  name: any;
  'data-test-subj': string;
}

export const FlyoutWrapper = ({ node, closeFlyout }: Props) => {
  const { getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const currentTimeRange = {
    ...getDateRangeAsTimestamp(),
    interval: '1m',
  };

  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutOpen();

  // This map allow to keep track of which tabs content have been rendered the first time.
  // We need it in order to load a tab content only if it gets clicked, and then keep it in the DOM for performance improvement.
  const renderedTabsSet = useLazyRef(() => new Set([hostFlyoutOpen?.selectedTabId]));

  const onTabClick = (tab: Tab) => {
    renderedTabsSet.current.add(tab.id); // On a tab click, mark the tab content as allowed to be rendered
    setHostFlyoutOpen({ selectedTabId: tab.id });
  };

  return (
    <Flyout
      node={node}
      closeFlyout={closeFlyout}
      onTabClick={onTabClick}
      renderedTabsSet={renderedTabsSet}
      currentTimeRange={currentTimeRange}
      hostFlyoutOpen={hostFlyoutOpen}
    />
  );
};
