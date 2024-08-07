/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { SYSTEM_INTEGRATION } from '../../../../common/constants';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useParentBreadcrumbResolver } from '../../../hooks/use_parent_breadcrumb_resolver';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { InfraLoadingPanel } from '../../loading';
import { ASSET_DETAILS_PAGE_COMPONENT_NAME } from '../constants';
import { Content } from '../content/content';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useMetadataStateContext } from '../hooks/use_metadata_state';
import { usePageHeader } from '../hooks/use_page_header';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import { ContentTemplateProps } from '../types';
import { getIntegrationsAvailable } from '../utils';
import { InfraPageTemplate } from '../../shared/templates/infra_page_template';
import { OnboardingFlow } from '../../shared/templates/no_data_config';

const DATA_AVAILABILITY_PER_TYPE: Partial<Record<InventoryItemType, string[]>> = {
  host: [SYSTEM_INTEGRATION],
};

export const Page = ({ tabs = [], links = [] }: ContentTemplateProps) => {
  const { loading } = useAssetDetailsRenderPropsContext();
  const { metadata, loading: metadataLoading } = useMetadataStateContext();
  const { rightSideItems, tabEntries, breadcrumbs: headerBreadcrumbs } = usePageHeader(tabs, links);
  const { asset } = useAssetDetailsRenderPropsContext();
  const trackOnlyOnce = React.useRef(false);

  const { activeTabId } = useTabSwitcherContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const parentBreadcrumbResolver = useParentBreadcrumbResolver();
  const breadcrumbOptions = parentBreadcrumbResolver.getBreadcrumbOptions(asset.type);
  useMetricsBreadcrumbs(
    [
      {
        ...breadcrumbOptions.link,
        text: breadcrumbOptions.text,
      },
      {
        text: asset.name,
      },
    ],
    { deeperContextServerless: true }
  );

  useEffect(() => {
    if (trackOnlyOnce.current) {
      return;
    }
    if (!metadataLoading && metadata) {
      const integrations = getIntegrationsAvailable(metadata);
      const telemetryParams = {
        componentName: ASSET_DETAILS_PAGE_COMPONENT_NAME,
        assetType: asset.type,
        tabId: activeTabId,
      };

      telemetry.reportAssetDetailsPageViewed(
        integrations.length > 0
          ? {
              ...telemetryParams,
              integrations,
            }
          : telemetryParams
      );
      trackOnlyOnce.current = true;
    }
  }, [activeTabId, asset.type, metadata, metadataLoading, telemetry]);

  return (
    <InfraPageTemplate
      onboardingFlow={asset.type === 'host' ? OnboardingFlow.Hosts : OnboardingFlow.Infra}
      dataAvailabilityModules={DATA_AVAILABILITY_PER_TYPE[asset.type] || undefined}
      pageHeader={{
        pageTitle: asset.name,
        tabs: tabEntries,
        rightSideItems,
        breadcrumbs: headerBreadcrumbs,
      }}
      data-component-name={ASSET_DETAILS_PAGE_COMPONENT_NAME}
      data-asset-type={asset.type}
    >
      {loading ? (
        <EuiFlexGroup
          direction="column"
          css={css`
            height: calc(100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)));
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
        <Content />
      )}
    </InfraPageTemplate>
  );
};
