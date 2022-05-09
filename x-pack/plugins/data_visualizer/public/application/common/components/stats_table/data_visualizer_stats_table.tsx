/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  HorizontalAlignment,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
  EuiResizeObserver,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiTableComputedColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { throttle } from 'lodash';
import { JOB_FIELD_TYPES } from '../../../../../common/constants';
import type { JobFieldType, DataVisualizerTableState } from '../../../../../common/types';
import { DocumentStat } from './components/field_data_row/document_stats';
import { IndexBasedNumberContentPreview } from './components/field_data_row/number_content_preview';

import { useTableSettings } from './use_table_settings';
import { TopValuesPreview } from './components/field_data_row/top_values_preview';
import {
  FieldVisConfig,
  FileBasedFieldVisConfig,
  isIndexBasedFieldVisConfig,
} from '../../../../../common/types/field_vis_config';
import { FileBasedNumberContentPreview } from '../field_data_row';
import { BooleanContentPreview } from './components/field_data_row';
import { calculateTableColumnsDimensions } from './utils';
import { DistinctValues } from './components/field_data_row/distinct_values';
import { FieldTypeIcon } from '../field_type_icon';
import './_index.scss';

const FIELD_NAME = 'fieldName';

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

type DataVisualizerTableItem = FieldVisConfig | FileBasedFieldVisConfig;
interface DataVisualizerTableProps<T> {
  items: T[];
  pageState: DataVisualizerTableState;
  updatePageState: (update: DataVisualizerTableState) => void;
  getItemIdToExpandedRowMap: (itemIds: string[], items: T[]) => ItemIdToExpandedRowMap;
  extendedColumns?: Array<EuiBasicTableColumn<T>>;
  showPreviewByDefault?: boolean;
  /** Callback to receive any updates when table or page state is changed **/
  onChange?: (update: Partial<DataVisualizerTableState>) => void;
  loading?: boolean;
}

export const DataVisualizerTable = <T extends DataVisualizerTableItem>({
  items,
  pageState,
  updatePageState,
  getItemIdToExpandedRowMap,
  extendedColumns,
  showPreviewByDefault,
  onChange,
  loading,
}: DataVisualizerTableProps<T>) => {
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<string[]>([]);
  const [expandAll, setExpandAll] = useState<boolean>(false);

  const { onTableChange, pagination, sorting } = useTableSettings<T>(
    items,
    pageState,
    updatePageState
  );
  const [showDistributions, setShowDistributions] = useState<boolean>(showPreviewByDefault ?? true);
  const [dimensions, setDimensions] = useState(calculateTableColumnsDimensions());
  const [tableWidth, setTableWidth] = useState<number>(1400);

  const toggleExpandAll = useCallback(
    (shouldExpandAll: boolean) => {
      setExpandedRowItemIds(
        shouldExpandAll
          ? // Update list of ids in expandedRowIds to include all
            (items.map((item) => item.fieldName).filter((id) => id !== undefined) as string[])
          : // Otherwise, reset list of ids in expandedRowIds
            []
      );
      setExpandAll(shouldExpandAll);
    },
    [items]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      // When window or table is resized,
      // update the column widths and other settings accordingly
      setTableWidth(e.width);
      setDimensions(calculateTableColumnsDimensions(e.width));
    }, 500),
    [tableWidth]
  );

  const toggleShowDistribution = useCallback(() => {
    setShowDistributions(!showDistributions);
    if (onChange) {
      onChange({ showDistributions: !showDistributions });
    }
  }, [onChange, showDistributions]);

  function toggleDetails(item: DataVisualizerTableItem) {
    if (item.fieldName === undefined) return;
    const index = expandedRowItemIds.indexOf(item.fieldName);
    if (index !== -1) {
      expandedRowItemIds.splice(index, 1);
    } else {
      expandedRowItemIds.push(item.fieldName);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  const columns = useMemo(() => {
    const expanderColumn: EuiTableComputedColumnType<DataVisualizerTableItem> = {
      name:
        dimensions.breakPoint !== 'xs' && dimensions.breakPoint !== 's' ? (
          <EuiButtonIcon
            data-test-subj={`dataVisualizerToggleDetailsForAllRowsButton ${
              expandAll ? 'expanded' : 'collapsed'
            }`}
            onClick={() => toggleExpandAll(!expandAll)}
            aria-label={
              !expandAll
                ? i18n.translate('xpack.dataVisualizer.dataGrid.expandDetailsForAllAriaLabel', {
                    defaultMessage: 'Expand details for all fields',
                  })
                : i18n.translate('xpack.dataVisualizer.dataGrid.collapseDetailsForAllAriaLabel', {
                    defaultMessage: 'Collapse details for all fields',
                  })
            }
            iconType={expandAll ? 'arrowDown' : 'arrowRight'}
          />
        ) : null,
      align: RIGHT_ALIGNMENT,
      width: dimensions.expander,
      isExpander: true,
      render: (item: DataVisualizerTableItem) => {
        const displayName = item.displayName ?? item.fieldName;
        if (item.fieldName === undefined) return null;
        const direction = expandedRowItemIds.includes(item.fieldName) ? 'arrowDown' : 'arrowRight';
        return (
          <EuiButtonIcon
            data-test-subj={`dataVisualizerDetailsToggle-${item.fieldName}-${direction}`}
            onClick={() => toggleDetails(item)}
            aria-label={
              expandedRowItemIds.includes(item.fieldName)
                ? i18n.translate('xpack.dataVisualizer.dataGrid.rowCollapse', {
                    defaultMessage: 'Hide details for {fieldName}',
                    values: { fieldName: displayName },
                  })
                : i18n.translate('xpack.dataVisualizer.dataGrid.rowExpand', {
                    defaultMessage: 'Show details for {fieldName}',
                    values: { fieldName: displayName },
                  })
            }
            iconType={direction}
          />
        );
      },
      'data-test-subj': 'dataVisualizerTableColumnDetailsToggle',
    };

    const baseColumns = [
      expanderColumn,
      {
        field: 'type',
        name: i18n.translate('xpack.dataVisualizer.dataGrid.typeColumnName', {
          defaultMessage: 'Type',
        }),
        render: (fieldType: JobFieldType) => {
          return <FieldTypeIcon type={fieldType} tooltipEnabled={true} />;
        },
        width: dimensions.type,
        sortable: true,
        align: CENTER_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnType',
      },
      {
        field: 'fieldName',
        name: i18n.translate('xpack.dataVisualizer.dataGrid.nameColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: true,
        render: (fieldName: string, item: DataVisualizerTableItem) => {
          const displayName = item.displayName ?? item.fieldName;

          return (
            <EuiText size="xs" data-test-subj={`dataVisualizerDisplayName-${item.fieldName}`}>
              {displayName}
            </EuiText>
          );
        },
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnName',
      },
      {
        field: 'docCount',
        name: i18n.translate('xpack.dataVisualizer.dataGrid.documentsCountColumnName', {
          defaultMessage: 'Documents (%)',
        }),
        render: (value: number | undefined, item: DataVisualizerTableItem) => (
          <DocumentStat config={item} showIcon={dimensions.showIcon} />
        ),
        sortable: (item: DataVisualizerTableItem) => item?.stats?.count,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDocumentsCount',
        width: dimensions.docCount,
      },
      {
        field: 'stats.cardinality',
        name: i18n.translate('xpack.dataVisualizer.dataGrid.distinctValuesColumnName', {
          defaultMessage: 'Distinct values',
        }),
        render: (cardinality: number | undefined) => (
          <DistinctValues cardinality={cardinality} showIcon={dimensions.showIcon} />
        ),

        sortable: true,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDistinctValues',
        width: dimensions.distinctValues,
      },
      {
        name: (
          <div className={'columnHeader__title'}>
            {dimensions.showIcon ? (
              <EuiIcon type={'visBarVertical'} className={'columnHeader__icon'} />
            ) : null}
            {i18n.translate('xpack.dataVisualizer.dataGrid.distributionsColumnName', {
              defaultMessage: 'Distributions',
            })}
            {
              <EuiToolTip
                content={
                  !showDistributions
                    ? i18n.translate('xpack.dataVisualizer.dataGrid.showDistributionsTooltip', {
                        defaultMessage: 'Show distributions',
                      })
                    : i18n.translate('xpack.dataVisualizer.dataGrid.hideDistributionsTooltip', {
                        defaultMessage: 'Hide distributions',
                      })
                }
              >
                <EuiButtonIcon
                  style={{ marginLeft: 4 }}
                  size={'s'}
                  iconType={!showDistributions ? 'eye' : 'eyeClosed'}
                  onClick={() => toggleShowDistribution()}
                  aria-label={
                    showDistributions
                      ? i18n.translate('xpack.dataVisualizer.dataGrid.showDistributionsAriaLabel', {
                          defaultMessage: 'Show distributions',
                        })
                      : i18n.translate('xpack.dataVisualizer.dataGrid.hideDistributionsAriaLabel', {
                          defaultMessage: 'Hide distributions',
                        })
                  }
                />
              </EuiToolTip>
            }
          </div>
        ),
        render: (item: DataVisualizerTableItem) => {
          if (item === undefined || showDistributions === false) return null;

          if ('loading' in item && item.loading === true) {
            return (
              <EuiText textAlign="center">
                <EuiLoadingSpinner size="s" />
              </EuiText>
            );
          }

          if (
            (item.type === JOB_FIELD_TYPES.KEYWORD || item.type === JOB_FIELD_TYPES.IP) &&
            item.stats?.topValues !== undefined
          ) {
            return <TopValuesPreview config={item} />;
          }

          if (item.type === JOB_FIELD_TYPES.NUMBER) {
            if (isIndexBasedFieldVisConfig(item) && item.stats?.distribution !== undefined) {
              // If the cardinality is only low, show the top values instead of a distribution chart
              return item.stats?.distribution?.percentiles.length <= 2 ? (
                <TopValuesPreview config={item} isNumeric={true} />
              ) : (
                <IndexBasedNumberContentPreview config={item} />
              );
            } else {
              return <FileBasedNumberContentPreview config={item} />;
            }
          }

          if (item.type === JOB_FIELD_TYPES.BOOLEAN) {
            return <BooleanContentPreview config={item} />;
          }

          return null;
        },
        width: dimensions.distributions,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDistribution',
      },
    ];
    return extendedColumns ? [...baseColumns, ...extendedColumns] : baseColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    expandAll,
    showDistributions,
    updatePageState,
    extendedColumns,
    dimensions.breakPoint,
    toggleExpandAll,
  ]);

  const itemIdToExpandedRowMap = useMemo(() => {
    const itemIds = expandedRowItemIds;
    return getItemIdToExpandedRowMap(itemIds, items);
  }, [items, expandedRowItemIds, getItemIdToExpandedRowMap]);

  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <div data-test-subj="dataVisualizerTableContainer" ref={resizeRef}>
          <EuiInMemoryTable<T>
            message={
              loading
                ? i18n.translate('xpack.dataVisualizer.dataGrid.searchingMessage', {
                    defaultMessage: 'Searching',
                  })
                : undefined
            }
            className={'dvTable'}
            items={items}
            itemId={FIELD_NAME}
            columns={columns}
            pagination={pagination}
            sorting={sorting}
            isExpandable={true}
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            isSelectable={false}
            onTableChange={onTableChange}
            data-test-subj={'dataVisualizerTable'}
            rowProps={(item) => ({
              'data-test-subj': `dataVisualizerRow row-${item.fieldName}`,
            })}
          />
        </div>
      )}
    </EuiResizeObserver>
  );
};
