/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlyout,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiCodeBlock,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect } from 'react';
import { RiskQueries } from '../../../common/search_strategy';
import type { FillColor } from '../../common/components/charts/donutchart';
import { DonutChart } from '../../common/components/charts/donutchart';
import { HeaderPage } from '../../common/components/header_page';
import { HeaderSection } from '../../common/components/header_section';
import { BasicTable } from '../../common/components/ml/tables/basic_table';
import { useSearchStrategy } from '../../common/containers/use_search_strategy';
import { getSeverityColor } from '../../detections/components/alerts_kpis/severity_level_panel/helpers';

const useViewEntityFlyout = () => {
  const [isViewEntityPanelVisible, setIsViewEntityPanelVisible] = React.useState(false);
  const [viewEntityPanelData, setViewEntityPanelData] = React.useState<any | null>(null);

  const closeViewEntityPanel = useCallback(() => {
    setIsViewEntityPanelVisible(false);
  }, []);

  const openViewEntityPanel = useCallback((data: any) => {
    setViewEntityPanelData(data);
    setIsViewEntityPanelVisible(true);
  }, []);

  return {
    closeViewEntityPanel,
    isViewEntityPanelVisible,
    openViewEntityPanel,
    viewEntityPanelData,
  };
};

const ViewEntityFlyout = ({ data, onClose }: { data: any; onClose: () => void }) => {
  return (
    <EuiFlyout ownFocus onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <EuiText>{'View Entity'}</EuiText>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock isCopyable language="json" fontSize="m">
          {JSON.stringify(data, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const EntityStorePage = () => {
  const { result: donutChartResponse, search: searchDonutChart } =
    useSearchStrategy<RiskQueries.entityStore>({
      factoryQueryType: RiskQueries.entityStore,
      initialResult: {},
      errorMessage: 'donut chart error',
    });

  const {
    isViewEntityPanelVisible,
    openViewEntityPanel,
    closeViewEntityPanel,
    viewEntityPanelData,
  } = useViewEntityFlyout();

  useEffect(() => {
    searchDonutChart({
      params: {
        query: {
          aggs: {
            donutChart: {
              terms: {
                field: 'host.risk.calculated_level',
                order: {
                  _count: 'asc',
                },
                size: 6,
              },
            },
          },
          size: 0,
        },
      },
      defaultIndex: ['.entities.entities-default'],
    });
  }, [searchDonutChart]);

  const donutData = (
    (donutChartResponse as any)?.response?.aggregations?.donutChart?.buckets ?? []
  ).map(({ doc_count: count, key }: { doc_count: number; key: string }) => ({ key, value: count }));

  const donutTotal = (donutChartResponse as any)?.response?.hits?.total;

  const donutChartFillColor: FillColor = useCallback((dataName) => {
    return getSeverityColor(dataName);
  }, []);

  const { result: newHostsResponse, search: searchNewHosts } =
    useSearchStrategy<RiskQueries.entityStore>({
      factoryQueryType: RiskQueries.entityStore,
      initialResult: {},
      errorMessage: 'new hosts error',
    });

  useEffect(() => {
    searchNewHosts({
      params: {
        query: {
          sort: [
            {
              first_seen: {
                order: 'desc',
                unmapped_type: 'boolean',
              },
            },
          ],
          fields: [
            {
              field: 'host.name',
            },
            {
              field: 'first_seen',
              format: 'strict_date_optional_time',
            },
          ],
          size: 4,
          _source: false,
        },
      },
      defaultIndex: ['.entities.entities-default'],
    });
  }, [searchNewHosts]);

  const newHostsTableData = ((newHostsResponse as any)?.response?.hits?.hits ?? []).map(
    (hit: any) => ({
      value: hit.fields['host.name'][0],
    })
  );

  const newHostsColumns: Array<EuiBasicTableColumn<{ value: string }>> = [
    {
      name: 'Host',
      field: 'value',
    },
  ];

  const { result: allHostsResponse, search: searchAllHosts } =
    useSearchStrategy<RiskQueries.entityStore>({
      factoryQueryType: RiskQueries.entityStore,
      initialResult: {},
      errorMessage: 'all hosts error',
    });

  useEffect(() => {
    searchAllHosts({
      params: {
        query: {
          size: 100,
        },
      },
      defaultIndex: ['.entities.entities-default'],
    });
  }, [searchAllHosts]);

  const allHostsTableData = ((allHostsResponse as any)?.response?.hits?.hits ?? []).map(
    (hit: any) => hit._source
  );

  const allHostsColumns: Array<EuiBasicTableColumn<{ value: string }>> = [
    {
      name: 'OS',
      field: 'host.os.name',
      sortable: true,
    },
    {
      name: 'Host',
      field: 'host.name',
      sortable: true,
    },
    {
      name: 'Asset criticality',
      field: 'host.asset.criticality',
      sortable: true,
    },
    {
      name: 'Risk Score',
      field: 'host.risk.calculated_score_norm',
      sortable: true,
    },
    {
      name: 'Last Seen',
      field: 'last_seen',
      sortable: true,
    },
    {
      actions: [
        {
          render: (data) => {
            return (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiButtonIcon
                  iconType="inspect"
                  aria-label="Inspect"
                  onClick={() => openViewEntityPanel(data)}
                />
              </EuiFlexGroup>
            );
          },
        },
      ],
    },
  ];

  return (
    <>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Section component="div">
          <HeaderPage
            data-test-subj="entityAnalyticsManagementPageTitle"
            title={'Entity Store - Hosts'}
          />
          {isViewEntityPanelVisible && (
            <ViewEntityFlyout data={viewEntityPanelData} onClose={closeViewEntityPanel} />
          )}
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder>
                <HeaderSection titleSize="s" title={'Risk level'} />
                <EuiSpacer size="m" />

                <DonutChart
                  data={donutData}
                  fillColor={donutChartFillColor}
                  height={150}
                  label={'Resources'}
                  title={donutTotal}
                  totalCount={5}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiPanel hasBorder>
                <HeaderSection titleSize="s" title={'Newly discovered hosts'} />
                <EuiSpacer size="m" />

                <BasicTable columns={newHostsColumns} items={newHostsTableData} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiInMemoryTable
            columns={allHostsColumns}
            items={allHostsTableData}
            pagination
            sorting
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </>
  );
};

EntityStorePage.displayName = 'EntityStorePage';
