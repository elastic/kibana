/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useContext, useState } from 'react';
import type { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { withTheme } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { findInventoryModel } from '../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../common/inventory_models/types';
import { DocumentTitle } from '../../../components/document_title';
import { InfraLoadingPanel } from '../../../components/loading';
import { Source } from '../../../containers/metrics_source/source';
import { useLinkProps } from '../../../hooks/use_link_props';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { inventoryTitle } from '../../../translations';
import { MetricsPageTemplate } from '../page_template';
import { NodeDetailsPage } from './components/node_details_page';
import { useMetadata } from './hooks/use_metadata';
import { useMetricsTimeContext } from './hooks/use_metrics_time';
import type { NavItem } from './lib/side_nav_context';
import { withMetricPageProviders } from './page_providers';

interface Props {
  theme: EuiTheme | undefined;
  match: {
    params: {
      type: string;
      node: string;
    };
  };
}

export const MetricDetail = withMetricPageProviders(
  withTheme(({ match }: Props) => {
    const nodeId = match.params.node;
    const nodeType = match.params.type as InventoryItemType;
    const inventoryModel = findInventoryModel(nodeType);
    const { sourceId } = useContext(Source.Context);

    const {
      timeRange,
      parsedTimeRange,
      setTimeRange,
      refreshInterval,
      setRefreshInterval,
      isAutoReloading,
      setAutoReload,
      triggerRefresh,
    } = useMetricsTimeContext();
    const {
      name,
      filteredRequiredMetrics,
      loading: metadataLoading,
      cloudId,
      metadata,
    } = useMetadata(nodeId, nodeType, inventoryModel.requiredMetrics, sourceId, parsedTimeRange);

    const [sideNav, setSideNav] = useState<NavItem[]>([]);

    const addNavItem = React.useCallback(
      (item: NavItem) => {
        if (!sideNav.some((n) => n.id === item.id)) {
          setSideNav([item, ...sideNav]);
        }
      },
      [sideNav]
    );

    const inventoryLinkProps = useLinkProps({
      app: 'metrics',
      pathname: '/inventory',
    });

    useMetricsBreadcrumbs([
      {
        ...inventoryLinkProps,
        text: inventoryTitle,
      },
      {
        text: name,
      },
    ]);

    if (metadataLoading && !filteredRequiredMetrics.length) {
      return (
        <MetricsPageTemplate>
          <InfraLoadingPanel
            height="100vh"
            width="100%"
            text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
              defaultMessage: 'Loading data',
            })}
          />
        </MetricsPageTemplate>
      );
    }

    return (
      <>
        <DocumentTitle
          title={i18n.translate('xpack.infra.metricDetailPage.documentTitle', {
            defaultMessage: 'Infrastructure | Metrics | {name}',
            values: {
              name,
            },
          })}
        />
        {metadata ? (
          <NodeDetailsPage
            name={name}
            requiredMetrics={filteredRequiredMetrics}
            sourceId={sourceId}
            timeRange={timeRange}
            nodeType={nodeType}
            nodeId={nodeId}
            cloudId={cloudId}
            metadataLoading={metadataLoading}
            isAutoReloading={isAutoReloading}
            refreshInterval={refreshInterval}
            sideNav={sideNav}
            metadata={metadata}
            addNavItem={addNavItem}
            setRefreshInterval={setRefreshInterval}
            setAutoReload={setAutoReload}
            triggerRefresh={triggerRefresh}
            setTimeRange={setTimeRange}
          />
        ) : null}
      </>
    );
  })
);
