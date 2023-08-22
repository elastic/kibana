/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AssetDetailsProps, ContentTemplateProps, RenderMode } from './types';
import { Flyout } from './template/flyout';
import { Page } from './template/page';
import { ContextProviders } from './context_providers';
import { TabSwitcherProvider } from './hooks/use_tab_switcher';
import { DataViewsProvider } from './hooks/use_data_views';

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
  tabs,
  links,
  renderMode,
  activeTabId,
  metricAlias,
  ...props
}: AssetDetailsProps) => {
  return (
    <ContextProviders props={{ ...props, renderMode }}>
      <TabSwitcherProvider
        initialActiveTabId={tabs.length > 0 ? activeTabId ?? tabs[0].id : undefined}
      >
        <DataViewsProvider metricAlias={metricAlias}>
          <ContentTemplate header={{ tabs, links }} renderMode={renderMode} />
        </DataViewsProvider>
      </TabSwitcherProvider>
    </ContextProviders>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
