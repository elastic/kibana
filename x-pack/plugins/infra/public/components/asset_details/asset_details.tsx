/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { AssetDetailsProps, RenderMode } from './types';
import { Content } from './content/content';
import { Header } from './header/header';
import { TabSwitcherProvider, useTabSwitcherContext } from './hooks/use_tab_switcher';
import {
  AssetDetailsStateProvider,
  useAssetDetailsStateContext,
} from './hooks/use_asset_details_state';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { ASSET_DETAILS_FLYOUT_COMPONENT_NAME } from './constants';

interface ContentTemplateProps {
  header: React.ReactElement;
  body: React.ReactElement;
  renderMode: RenderMode;
}

const ContentTemplate = ({ header, body, renderMode }: ContentTemplateProps) => {
  const { assetType } = useAssetDetailsStateContext();
  const { initialActiveTabId } = useTabSwitcherContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffectOnce(() => {
    telemetry.reportAssetDetailsFlyoutViewed({
      componentName: ASSET_DETAILS_FLYOUT_COMPONENT_NAME,
      assetType,
      tabId: initialActiveTabId,
    });
  });

  return renderMode.mode === 'flyout' ? (
    <EuiFlyout
      onClose={renderMode.closeFlyout}
      ownFocus={false}
      data-component-name={ASSET_DETAILS_FLYOUT_COMPONENT_NAME}
      data-asset-type={assetType}
    >
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
    <AssetDetailsStateProvider
      state={{
        asset,
        assetType,
        overrides,
        onTabsStateChange,
        dateRange,
        renderMode,
      }}
    >
      <TabSwitcherProvider
        initialActiveTabId={tabs.length > 0 ? activeTabId ?? tabs[0].id : undefined}
      >
        <ContentTemplate
          header={<Header compact={renderMode.mode === 'flyout'} tabs={tabs} links={links} />}
          body={<Content />}
          renderMode={renderMode}
        />
      </TabSwitcherProvider>
    </AssetDetailsStateProvider>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default AssetDetails;
