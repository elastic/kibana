/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AssetDetailsProps, ContentTemplateProps, RenderMode } from './types';
import { TabSwitcherProvider } from './hooks/use_tab_switcher';
import { AssetDetailsStateProvider } from './hooks/use_asset_details_state';
import { MetadataProvider } from './hooks/use_metadata_provider';
import { DateRangeProvider } from './hooks/use_date_range_provider';
import { Flyout } from './template/flyout';
import { Page } from './template/page';

const ContentTemplate = ({
  header,
  renderMode,
}: ContentTemplateProps & { renderMode: RenderMode }) => {
  return renderMode.mode === 'flyout' ? (
    <Flyout header={header} closeFlyout={renderMode.closeFlyout} />
  ) : (
    <Page header={header} />
  );
};

export const AssetDetails = ({
  asset,
  dateRange,
  activeTabId,
  overrides,
  onTabsStateChange,
  tabs = [],
  links = [],
  assetType = 'host',
  renderMode = {
    mode: 'page',
  },
}: AssetDetailsProps) => {
  return (
    <DateRangeProvider dateRange={dateRange}>
      <MetadataProvider asset={asset} assetType={assetType}>
        <AssetDetailsStateProvider
          state={{
            asset,
            assetType,
            overrides,
            onTabsStateChange,
            renderMode,
          }}
        >
          <TabSwitcherProvider
            initialActiveTabId={tabs.length > 0 ? activeTabId ?? tabs[0].id : undefined}
          >
            <ContentTemplate header={{ tabs, links }} renderMode={renderMode} />
          </TabSwitcherProvider>
        </AssetDetailsStateProvider>
      </MetadataProvider>
    </DateRangeProvider>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
