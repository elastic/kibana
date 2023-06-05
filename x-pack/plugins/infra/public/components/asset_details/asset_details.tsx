/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import type { AssetDetailsProps, RenderMode } from './types';
import type { InventoryItemType } from '../../../common/inventory_models/types';
import { TabContent } from './tab_content/tab_content';
import { Header } from './header/header';
import { TabSwitcherProvider } from './hooks/use_tab_switcher';

// Setting host as default as it will be the only supported type for now
const NODE_TYPE = 'host' as InventoryItemType;

interface ContentTemplateProps {
  header: React.ReactElement;
  body: React.ReactElement;
  renderMode: RenderMode;
}

const ContentTemplate = ({ header, body, renderMode }: ContentTemplateProps) => {
  return renderMode.showInFlyout ? (
    <EuiFlyout onClose={renderMode.closeFlyout} ownFocus={false}>
      <EuiFlyoutHeader hasBorder>{header}</EuiFlyoutHeader>
      <EuiFlyoutBody>{body}</EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <>
      {header}
      {body}
    </>
  );
};

export const AssetDetails = ({
  node,
  currentTimeRange,
  activeTabId,
  overrides,
  onTabsStateChange,
  tabs,
  links,
  nodeType = NODE_TYPE,
  renderMode = {
    showInFlyout: false,
  },
}: AssetDetailsProps) => {
  return (
    <TabSwitcherProvider
      initialActiveTabId={tabs.length > 0 ? activeTabId ?? tabs[0].id : undefined}
    >
      <ContentTemplate
        header={
          <Header
            node={node}
            nodeType={nodeType}
            compact={renderMode.showInFlyout}
            tabs={tabs}
            links={links}
            onTabsStateChange={onTabsStateChange}
          />
        }
        body={
          <TabContent
            node={node}
            nodeType={nodeType}
            currentTimeRange={currentTimeRange}
            overrides={overrides}
            onTabsStateChange={onTabsStateChange}
          />
        }
        renderMode={renderMode}
      />
    </TabSwitcherProvider>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
