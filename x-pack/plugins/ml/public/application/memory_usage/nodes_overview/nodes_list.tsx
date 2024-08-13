/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { usePageUrlState } from '@kbn/ml-url-state';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { ModelsBarStats } from '../../components/stats_bar';
import { StatsBar } from '../../components/stats_bar';
import type { NodeDeploymentStatsResponse } from '../../../../common/types/trained_models';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { ExpandedRow } from './expanded_row';
import { MemoryPreviewChart } from './memory_preview_chart';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useRefresh } from '../../routing/use_refresh';

export type NodeItem = NodeDeploymentStatsResponse;

interface PageUrlState {
  pageKey: typeof ML_PAGES.MEMORY_USAGE;
  pageUrlState: ListingPageUrlState;
}

export const getDefaultNodesListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: 'name',
  sortDirection: 'asc',
});

export interface NodesListProps {
  compactView?: boolean;
}

export const NodesList: FC<NodesListProps> = ({ compactView = false }) => {
  const trainedModelsApiService = useTrainedModelsApiService();

  const refresh = useRefresh();

  const { displayErrorToast } = useToastNotificationService();
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const [items, setItems] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  const [pageState, updatePageState] = usePageUrlState<PageUrlState>(
    ML_PAGES.MEMORY_USAGE,
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
    } catch (e) {
      displayErrorToast(
        e,
        i18n.translate('xpack.ml.trainedModels.nodesList.nodesFetchError', {
          defaultMessage: 'Error loading overview on machine learning nodes',
        })
      );
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIdToExpandedRowMap]);

  const toggleDetails = (item: NodeItem) => {
    const itemIdToExpandedRowMapValues = cloneDeep(itemIdToExpandedRowMap);
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
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      'data-test-subj': 'mlNodesTableRowDetailsToggle',
    },
    {
      field: 'name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.nodeNameHeader', {
        defaultMessage: 'Name',
      }),
      width: '200px',
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
        'data-test-subj': 'mlTotalNodesCount',
      },
    };
  }, [items]);

  let tableSettings: object = useTableSettings<NodeItem>(items.length, pageState, updatePageState);

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

  useEffect(
    function updateOnTimerRefresh() {
      fetchNodesData();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh]
  );

  if (compactView) {
    tableSettings = {};
  }

  return (
    <div data-test-subj={'mlNodesOverviewPanel'}>
      {nodesStats && !compactView ? (
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
        </>
      ) : null}

      <div data-test-subj="mlNodesTableContainer">
        <EuiInMemoryTable<NodeItem>
          allowNeutralSort={false}
          columns={columns}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          items={items}
          itemId={'id'}
          loading={isLoading}
          search={compactView ? undefined : search}
          {...tableSettings}
          rowProps={(item) => ({
            'data-test-subj': `mlNodesTableRow row-${item.id}`,
          })}
          data-test-subj={isLoading ? 'mlNodesTable loading' : 'mlNodesTable loaded'}
        />
      </div>
    </div>
  );
};
