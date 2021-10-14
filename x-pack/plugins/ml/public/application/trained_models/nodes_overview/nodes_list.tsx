/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
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
import { getDefaultModelsListState } from '../models_management';
import { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { usePageUrlState } from '../../util/url_state';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { ExpandedRow } from './expanded_row';
import { useRefreshAnalyticsList } from '../../data_frame_analytics/common';

export type NodeItem = NodeDeploymentStatsResponse;

export interface NodeItemWithStats extends NodeItem {
  stats: any;
}

export const NodesList: FC = () => {
  const trainedModelsApiService = useTrainedModelsApiService();
  const [items, setItems] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [pageState, updatePageState] = usePageUrlState(
    ML_PAGES.TRAINED_MODELS_NODES,
    getDefaultModelsListState()
  );

  const searchQueryText = pageState.queryText ?? '';

  const fetchNodesData = useCallback(async () => {
    const nodesResponse = await trainedModelsApiService.getTrainedModelsNodesOverview();
    setItems(nodesResponse.nodes);
    setIsLoading(false);
  }, []);

  const toggleDetails = async (item: NodeItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      // await fetchModelsStats([item]);
      itemIdToExpandedRowMapValues[item.id] = <ExpandedRow item={item as NodeItemWithStats} />;
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
      'data-test-subj': 'mlModelsTableRowDetailsToggle',
    },
    {
      field: 'name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.nodeNameHeader', {
        defaultMessage: 'Name',
      }),
      width: '200px',
      sortable: true,
      truncateText: true,
      'data-test-subj': 'mlModelsTableColumnId',
    },
    {
      field: 'allocated_models',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.allocatedModelsHeader', {
        defaultMessage: 'Allocated models',
      }),
      sortable: false,
      truncateText: false,
      'data-test-subj': 'mlModelsTableColumnDescription',
      render: (v: NodeItem['allocated_models']) => {
        return v.map((m) => <EuiBadge color="hollow">{m.model_id}</EuiBadge>);
      },
    },
  ];

  const nodesStats: ModelsBarStats = useMemo(() => {
    return {
      total: {
        show: true,
        value: items.length,
        label: i18n.translate('xpack.ml.trainedModels.nodesList.totalAmountLabel', {
          defaultMessage: 'Total ML nodes',
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
      <div data-test-subj="mlModelsTableContainer">
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
            'data-test-subj': `mlModelsTableRow row-${item.id}`,
          })}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={sorting}
          data-test-subj={isLoading ? 'mlModelsTable loading' : 'mlModelsTable loaded'}
        />
      </div>
    </>
  );
};
