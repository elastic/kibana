/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
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
  EuiHealth,
  EuiTabs,
  EuiTab,
  EuiAccordion,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useMemo } from 'react';
import moment from 'moment';
import _ from 'lodash';
import type { RiskLevels } from '../../../common/entity_analytics';
import { RiskQueries } from '../../../common/search_strategy';
import type { FillColor } from '../../common/components/charts/donutchart';
import { DonutChart } from '../../common/components/charts/donutchart';
import { HeaderPage } from '../../common/components/header_page';
import { HeaderSection } from '../../common/components/header_section';
import { BasicTable } from '../../common/components/ml/tables/basic_table';
import { useSearchStrategy } from '../../common/containers/use_search_strategy';
import { getSeverityColor } from '../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { AssetCriticalityBadge } from '../components/asset_criticality/asset_criticality_badge';
import { RiskScoreLevel } from '../components/severity/common';
import { useEntityHistory } from '../api/hooks/use_get_entity_history';
import { EntityTimelinePOC } from './timeline_flyout_poc';
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
  const { isLoading: isLoadingHistoryData, data: historyData } = useEntityHistory({
    idField: 'host.name',
    idValue: data.host.name,
  });

  const historyContent = useMemo(() => {
    if (isLoadingHistoryData) {
      return <EuiText>{'Loading...'}</EuiText>;
    }

    if (!historyData) {
      return <EuiText>{'No history data found'}</EuiText>;
    }

    return (
      <>
        {historyData.history.map((history, index) => (
          <>
            <EuiSpacer />
            <EuiAccordion
              id={`history-${index}`}
              key={`history-${index}`}
              buttonContent={
                <EuiTitle size="xs">
                  <EuiText>
                    {'created' in history ? 'Created ' : 'Updated '}
                    {moment(history['@timestamp']).fromNow()}
                  </EuiText>
                </EuiTitle>
              }
            >
              <EuiPanel>
                <EuiAccordion
                  id={`history-${index}-entity`}
                  buttonContent={
                    <EuiTitle size="xs">
                      <EuiText>{'Entity'}</EuiText>
                    </EuiTitle>
                  }
                >
                  <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                    {JSON.stringify(history.entity, null, 2)}
                  </EuiCodeBlock>
                </EuiAccordion>
                <EuiSpacer />
                <EuiAccordion
                  id={`history-${index}-change`}
                  buttonContent={
                    <EuiTitle size="xs">
                      <EuiText>{'Change'}</EuiText>
                    </EuiTitle>
                  }
                >
                  <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                    {JSON.stringify(_.omit(history, 'entity'), null, 2)}
                  </EuiCodeBlock>
                </EuiAccordion>
              </EuiPanel>
            </EuiAccordion>
          </>
        ))}
      </>
    );
  }, [historyData, isLoadingHistoryData]);

  const tabs = [
    {
      id: 'host',
      name: 'Host',
      content: (
        <>
          {data.host && (
            <>
              <EuiSpacer />
              <EuiAccordion
                id="observed"
                buttonContent={
                  <EuiTitle size="xs">
                    <EuiText>{'Observed'}</EuiText>
                  </EuiTitle>
                }
              >
                <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                  {JSON.stringify(_.omit(data.host, ['agent', 'risk', 'asset']), null, 2)}
                </EuiCodeBlock>
              </EuiAccordion>
            </>
          )}
          {data.host?.agent && (
            <>
              <EuiSpacer />
              <EuiAccordion
                id="agent"
                buttonContent={
                  <EuiTitle size="xs">
                    <EuiText>{'Agent'}</EuiText>
                  </EuiTitle>
                }
              >
                <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                  {JSON.stringify(data.host.agent, null, 2)}
                </EuiCodeBlock>
              </EuiAccordion>
            </>
          )}
          {data.host?.risk && (
            <>
              <EuiSpacer />
              <EuiAccordion
                id="risk"
                buttonContent={
                  <EuiTitle size="xs">
                    <EuiText>{'Risk'}</EuiText>
                  </EuiTitle>
                }
              >
                <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                  {JSON.stringify(data.host.risk, null, 2)}
                </EuiCodeBlock>
              </EuiAccordion>
            </>
          )}
          {data.host?.asset && (
            <>
              <EuiSpacer />
              <EuiAccordion
                id="asset_criticality"
                buttonContent={
                  <EuiTitle size="xs">
                    <EuiText>{'Asset Criticality'}</EuiText>
                  </EuiTitle>
                }
              >
                <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
                  {JSON.stringify(data.host.asset, null, 2)}
                </EuiCodeBlock>
              </EuiAccordion>
            </>
          )}
        </>
      ),
    },
    {
      id: 'raw',
      name: 'Raw Data',
      content: (
        <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
          {JSON.stringify(data, null, 2)}
        </EuiCodeBlock>
      ),
    },
    {
      id: 'history',
      name: 'Raw History',
      content: historyContent,
    },
  ];

  const [selectedTabId, setSelectedTabId] = React.useState(tabs[0].id);
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
  return (
    <EuiFlyout ownFocus onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <EuiText>{'View Entity'}</EuiText>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              onClick={() => setSelectedTabId(tab.id)}
              isSelected={tab.id === selectedTabId}
              key={tab.id}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        {selectedTab?.content}
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

  const [isTimelinePanelVisible, setIsViewEntityPanelVisible] = React.useState(false);
  const closeTimelinePanel = useCallback(() => {
    setIsViewEntityPanelVisible(false);
  }, []);

  const openTimelinePanel = useCallback((data: any) => {
    setIsViewEntityPanelVisible(true);
  }, []);

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
      width: '20%',
    },
    {
      name: 'Risk Level',
      field: 'host.risk.calculated_level',
      render: (data?: RiskLevels) => (data ? <RiskScoreLevel severity={data} /> : '-'),
      sortable: true,
    },
    {
      name: 'Risk Score',
      field: 'host.risk.calculated_score_norm',
      render: (data?: number) => (data ? data.toFixed(0) : ''),
      sortable: true,
    },
    {
      name: 'Asset criticality',
      field: 'host.asset.criticality',
      sortable: true,
      render: (data: string) => (
        <AssetCriticalityBadge criticalityLevel={(data as any) || 'unassigned'} />
      ),
    },
    {
      name: 'Agent Status',
      field: 'host.agent.status',
      sortable: true,
      render: (data?: string) => (data ? <EuiHealth color="success">{data}</EuiHealth> : '-'),
    },
    {
      name: 'Last Seen',
      field: 'last_seen',
      render: (data?: string) => (data ? moment(data).fromNow() : ''),
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
          {isTimelinePanelVisible && <EntityTimelinePOC onClose={closeTimelinePanel} />}
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
          <EuiSpacer size="l" />
          <EuiButton onClick={openTimelinePanel}>{'Open Timeline POC'}</EuiButton>
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </>
  );
};

EntityStorePage.displayName = 'EntityStorePage';
