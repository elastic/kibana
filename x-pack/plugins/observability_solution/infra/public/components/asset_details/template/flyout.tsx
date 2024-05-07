/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { InfraLoadingPanel } from '../../loading';
import { ASSET_DETAILS_FLYOUT_COMPONENT_NAME } from '../constants';
import { Content } from '../content/content';
import { FlyoutHeader } from '../header/flyout_header';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../hooks/use_asset_details_url_state';
import { usePageHeader } from '../hooks/use_page_header';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import type { ContentTemplateProps } from '../types';

export const Flyout = ({
  tabs = [],
  links = [],
  closeFlyout,
}: ContentTemplateProps & { closeFlyout: () => void }) => {
  const [, setUrlState] = useAssetDetailsUrlState();
  const { asset, loading } = useAssetDetailsRenderPropsContext();
  const { rightSideItems, tabEntries } = usePageHeader(tabs, links);
  const { activeTabId } = useTabSwitcherContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffectOnce(() => {
    telemetry.reportAssetDetailsFlyoutViewed({
      componentName: ASSET_DETAILS_FLYOUT_COMPONENT_NAME,
      assetType: asset.type,
      tabId: activeTabId,
    });
  });

  const handleOnClose = useCallback(() => {
    setUrlState(null);
    closeFlyout();
  }, [closeFlyout, setUrlState]);

  return (
    <EuiFlyout
      onClose={handleOnClose}
      ownFocus={false}
      data-component-name={ASSET_DETAILS_FLYOUT_COMPONENT_NAME}
      data-asset-type={asset.type}
    >
      {loading ? (
        <InfraLoadingPanel
          height="100%"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      ) : (
        <>
          <EuiFlyoutHeader hasBorder>
            <FlyoutHeader title={asset.name} tabs={tabEntries} rightSideItems={rightSideItems} />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <Content />
          </EuiFlyoutBody>
        </>
      )}
    </EuiFlyout>
  );
};
