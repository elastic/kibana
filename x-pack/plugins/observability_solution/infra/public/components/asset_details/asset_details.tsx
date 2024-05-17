/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ContextProviders } from './context_providers';
import { DataViewsProvider } from './hooks/use_data_views';
import { TabSwitcherProvider } from './hooks/use_tab_switcher';
import { Flyout } from './template/flyout';
import { Page } from './template/page';
import type { AssetDetailsProps, ContentTemplateProps, RenderMode } from './types';

const ContentTemplate = ({
  tabs,
  links,
  renderMode,
}: ContentTemplateProps & { renderMode: RenderMode }) => {
  return renderMode.mode === 'flyout' ? (
    <Flyout tabs={tabs} links={links} closeFlyout={renderMode.closeFlyout!} />
  ) : (
    <Page tabs={tabs} links={links} />
  );
};

export const AssetDetails = ({
  tabs,
  links,
  renderMode,
  metricAlias,
  ...props
}: AssetDetailsProps) => {
  return (
    <ContextProviders {...props} renderMode={renderMode}>
      <TabSwitcherProvider defaultActiveTabId={tabs[0]?.id}>
        <DataViewsProvider metricAlias={metricAlias}>
          <ContentTemplate tabs={tabs} links={links} renderMode={renderMode} />
        </DataViewsProvider>
      </TabSwitcherProvider>
    </ContextProviders>
  );
};
