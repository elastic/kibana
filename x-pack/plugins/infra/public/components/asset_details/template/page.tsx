/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import type { InfraMetadata } from '../../../../common/http_api';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useKibanaHeader } from '../../../hooks/use_kibana_header';
import { InfraLoadingPanel } from '../../loading';
import { ASSET_DETAILS_PAGE_COMPONENT_NAME } from '../constants';
import { Content } from '../content/content';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useMetadataStateProviderContext } from '../hooks/use_metadata_state';
import { usePageHeader } from '../hooks/use_page_header';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import type { ContentTemplateProps } from '../types';

// TODO
const INTEGRATIONS = {
  nginx: ['nginx.stubstatus', 'nginx.access'],
  kubernetes: ['kubernetes.node'],
};

const getIntegrationAvailable = (
  integration: 'nginx' | 'kubernetes',
  metadata?: InfraMetadata | null
) => {
  if (metadata) {
    return metadata?.features?.some((f) => INTEGRATIONS[integration].includes(f.name))
      ? integration
      : null;
  }
};

export const Page = ({ header: { tabs = [], links = [] } }: ContentTemplateProps) => {
  const { loading } = useAssetDetailsRenderPropsContext();
  const { metadata, loading: metadataLoading } = useMetadataStateProviderContext();
  const { rightSideItems, tabEntries, breadcrumbs } = usePageHeader(tabs, links);
  const { asset, assetType } = useAssetDetailsRenderPropsContext();
  const { headerHeight } = useKibanaHeader();
  const trackOnlyOnce = React.useRef(false);

  const { activeTabId } = useTabSwitcherContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    if (trackOnlyOnce.current) {
      return;
    }
    if (!metadataLoading && metadata) {
      const nginx = getIntegrationAvailable('nginx', metadata);
      const kubernetes = getIntegrationAvailable('kubernetes', metadata);
      const integrations = [nginx, kubernetes].filter(Boolean);

      telemetry.reportAssetDetailsFlyoutViewed({
        componentName: ASSET_DETAILS_PAGE_COMPONENT_NAME,
        assetType,
        tabId: activeTabId,
      });
      trackOnlyOnce.current = true;
    }
  }, [activeTabId, assetType, metadata, metadataLoading, telemetry]);

  return loading ? (
    <EuiFlexGroup
      direction="column"
      css={css`
        height: calc(100vh - ${headerHeight}px);
      `}
    >
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    </EuiFlexGroup>
  ) : (
    <EuiPageTemplate
      panelled
      contentBorder={false}
      offset={0}
      restrictWidth={false}
      style={{ minBlockSize: `calc(100vh - ${headerHeight}px)` }}
    >
      <EuiPageTemplate.Section paddingSize="none">
        <EuiPageTemplate.Header
          pageTitle={asset.name}
          tabs={tabEntries}
          rightSideItems={rightSideItems}
          breadcrumbs={breadcrumbs}
        />
        <EuiPageTemplate.Section grow>
          <Content />
        </EuiPageTemplate.Section>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
