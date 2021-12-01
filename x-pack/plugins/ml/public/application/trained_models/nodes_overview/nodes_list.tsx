/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSearchBarProps,
  EuiSpacer,
} from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { ModelsBarStats, StatsBar } from '../../components/stats_bar';
import { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { usePageUrlState } from '../../util/url_state';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { ExpandedRow } from './expanded_row';
import {
  REFRESH_ANALYTICS_LIST_STATE,
  refreshAnalyticsList$,
  useRefreshAnalyticsList,
} from '../../data_frame_analytics/common';
import { MemoryPreviewChart } from './memory_preview_chart';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { ListingPageUrlState } from '../../../../common/types/common';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { FIELD_FORMAT_IDS } from '../../../../../../../src/plugins/field_formats/common';
import { useRefresh } from '../../routing/use_refresh';

export type NodeItem = NodeDeploymentStatsResponse;

export const getDefaultNodesListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'name',
  sortDirection: 'asc',
});

export const NodesList: FC = () => {
  const trainedModelsApiService = useTrainedModelsApiService();

  const refresh = useRefresh();

  const { displayErrorToast } = useToastNotificationService();
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const [items, setItems] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [pageState, updatePageState] = usePageUrlState(
    ML_PAGES.TRAINED_MODELS_NODES,
    getDefaultNodesListState()
  );

  const searchQueryText = pageState.queryText ?? '';

  const fetchNodesData = useCallback(async () => {
    try {
      const nodesResponse = await trainedModelsApiService.getTrainedModelsNodesOverview();
      setItems(nodesResponse.nodes);

      // Update expanded rows.
      nodesResponse.nodes.forEach((node) => {
        if (itemIdToExpandedRowMap[node.id]) {
          itemIdToExpandedRowMap[node.id] = <ExpandedRow item={node} />;
        }
      });

      setIsLoading(false);
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
    } catch (e) {
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.trainedModels.nodesList.nodesFetchError', {
          defaultMessage: 'Nodes fetch failed',
        })
      );
    }
  }, [itemIdToExpandedRowMap]);

  const toggleDetails = (item: NodeItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = <ExpandedRow item={item} />;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<NodeItem>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      render: (item: NodeItem) => (
        <EuiButtonIcon
          onClick={toggleDetails.bind(null, item)}
          aria-label={
            itemIdToExpandedRowMap[item.id]
              ? i18n.translate('xpack.ml.trainedModels.nodesList.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.ml.trainedModels.nodesList.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
      'data-test-subj': 'mlNodesTableRowDetailsToggle',
    },
    {
      field: 'name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.nodeNameHeader', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      truncateText: true,
      'data-test-subj': 'mlNodesTableColumnName',
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.nodeTotalMemoryHeader', {
        defaultMessage: 'Total memory',
      }),
      width: '200px',
      truncateText: true,
      'data-test-subj': 'mlNodesTableColumnTotalMemory',
      render: (v: NodeItem) => {
        return bytesFormatter(v.attributes['ml.machine_memory']);
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.nodeMemoryUsageHeader', {
        defaultMessage: 'Memory usage',
      }),
      truncateText: true,
      'data-test-subj': 'mlNodesTableColumnMemoryUsage',
      render: (v: NodeItem) => {
        return <MemoryPreviewChart memoryOverview={v.memory_overview} />;
      },
    },
  ];

  const nodesStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: items.length,
        label: i18n.translate('xpack.ml.trainedModels.nodesList.totalAmountLabel', {
          defaultMessage: 'Total machine learning nodes',
        }),
      },
    };
  }, [items]);

  const { onTableChange, pagination, sorting } = useTableSettings<NodeItem>(
    items,
    pageState,
    updatePageState
  );

  const search: EuiSearchBarProps = {
    query: searchQueryText,
    onChange: (searchChange) => {
      if (searchChange.error !== null) {
        return false;
      }
      updatePageState({ queryText: searchChange.queryText, pageIndex: 0 });
      return true;
    },
    box: {
      incremental: true,
    },
  };

  // Subscribe to the refresh observable to trigger reloading the model list.
  useRefreshAnalyticsList({
    isLoading: setIsLoading,
    onRefresh: fetchNodesData,
  });

  useEffect(
    function updateOnTimerRefresh() {
      fetchNodesData();
    },
    [refresh]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween">
        {nodesStats && (
          <EuiFlexItem grow={false}>
            <StatsBar stats={nodesStats} dataTestSub={'mlTrainedModelsNodesStatsBar'} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div data-test-subj="mlNodesTableContainer">
        <EuiInMemoryTable<NodeItem>
          allowNeutralSort={false}
          columns={columns}
          hasActions={true}
          isExpandable={true}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isSelectable={false}
          items={items}
          itemId={'id'}
          loading={isLoading}
          search={search}
          rowProps={(item) => ({
            'data-test-subj': `mlNodesTableRow row-${item.id}`,
          })}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlNodesTable loading' : 'mlNodesTable loaded'}
        />
      </div>
    </>
  );
};
