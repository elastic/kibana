/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { useContext, useState } from 'react';
import { euiStyled, EuiTheme, withTheme } from '../../../../observability/public';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { ColumnarPage, PageContent } from '../../components/page';
import { WithMetricsTime, WithMetricsTimeUrlState } from './containers/with_metrics_time';
import { withMetricPageProviders } from './page_providers';
import { useMetadata } from '../../containers/metadata/use_metadata';
import { Source } from '../../containers/source';
import { InfraLoadingPanel } from '../../components/loading';
import { findInventoryModel } from '../../../common/inventory_models';
import { NavItem } from './lib/side_nav_context';
import { NodeDetailsPage } from './components/node_details_page';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { InventoryItemType } from '../../../common/inventory_models/types';

const DetailPageContent = euiStyled(PageContent)`
  overflow: auto;
  background-color: ${props => props.theme.eui.euiColorLightestShade};
`;

interface Props {
  theme: EuiTheme;
  match: {
    params: {
      type: string;
      node: string;
    };
  };
}

export const MetricDetail = withMetricPageProviders(
  withTheme(({ match, theme }: Props) => {
    const uiCapabilities = useKibana().services.application?.capabilities;
    const nodeId = match.params.node;
    const nodeType = match.params.type as InventoryItemType;
    const inventoryModel = findInventoryModel(nodeType);
    const { sourceId } = useContext(Source.Context);
    const {
      name,
      filteredRequiredMetrics,
      loading: metadataLoading,
      cloudId,
      metadata,
    } = useMetadata(nodeId, nodeType, inventoryModel.requiredMetrics, sourceId);

    const [sideNav, setSideNav] = useState<NavItem[]>([]);

    const addNavItem = React.useCallback(
      (item: NavItem) => {
        if (!sideNav.some(n => n.id === item.id)) {
          setSideNav([item, ...sideNav]);
        }
      },
      [sideNav]
    );

    const breadcrumbs = [
      {
        href: '#/',
        text: i18n.translate('xpack.infra.header.infrastructureTitle', {
          defaultMessage: 'Metrics',
        }),
      },
      { text: name },
    ];

    if (metadataLoading && !filteredRequiredMetrics.length) {
      return (
        <InfraLoadingPanel
          height="100vh"
          width="100%"
          text={i18n.translate('xpack.infra.metrics.loadingNodeDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      );
    }

    return (
      <WithMetricsTime>
        {({
          timeRange,
          parsedTimeRange,
          setTimeRange,
          refreshInterval,
          setRefreshInterval,
          isAutoReloading,
          setAutoReload,
          triggerRefresh,
        }) => (
          <ColumnarPage>
            <Header
              breadcrumbs={breadcrumbs}
              readOnlyBadge={!uiCapabilities?.infrastructure?.save}
            />
            <WithMetricsTimeUrlState />
            <DocumentTitle
              title={i18n.translate('xpack.infra.metricDetailPage.documentTitle', {
                defaultMessage: 'Infrastructure | Metrics | {name}',
                values: {
                  name,
                },
              })}
            />
            <DetailPageContent data-test-subj="infraMetricsPage">
              {metadata ? (
                <NodeDetailsPage
                  name={name}
                  requiredMetrics={filteredRequiredMetrics}
                  sourceId={sourceId}
                  timeRange={timeRange}
                  parsedTimeRange={parsedTimeRange}
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
            </DetailPageContent>
          </ColumnarPage>
        )}
      </WithMetricsTime>
    );
  })
);
