/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
  HorizontalAlignment,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiTableComputedColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { JOB_FIELD_TYPES, JobFieldType, DataVisualizerTableState } from '../../../../../common';
import { FieldTypeIcon } from '../field_type_icon';
import { DocumentStat } from './components/field_data_row/document_stats';
import { DistinctValues } from './components/field_data_row/distinct_values';
import { IndexBasedNumberContentPreview } from './components/field_data_row/number_content_preview';

import { useTableSettings } from './use_table_settings';
import { TopValuesPreview } from './components/field_data_row/top_values_preview';
import {
  FieldVisConfig,
  FileBasedFieldVisConfig,
  isIndexBasedFieldVisConfig,
} from './types/field_vis_config';
import { FileBasedNumberContentPreview } from '../field_data_row';
import { BooleanContentPreview } from './components/field_data_row';

const FIELD_NAME = 'fieldName';

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

type DataVisualizerTableItem = FieldVisConfig | FileBasedFieldVisConfig;
interface DataVisualizerTableProps<T> {
  items: T[];
  pageState: DataVisualizerTableState;
  updatePageState: (update: DataVisualizerTableState) => void;
  getItemIdToExpandedRowMap: (itemIds: string[], items: T[]) => ItemIdToExpandedRowMap;
  extendedColumns?: Array<EuiBasicTableColumn<T>>;
}

export const DataVisualizerTable = <T extends DataVisualizerTableItem>({
  items,
  pageState,
  updatePageState,
  getItemIdToExpandedRowMap,
  extendedColumns,
}: DataVisualizerTableProps<T>) => {
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<string[]>([]);
  const [expandAll, toggleExpandAll] = useState<boolean>(false);

  const { onTableChange, pagination, sorting } = useTableSettings<T>(
    items,
    pageState,
    updatePageState
  );
  const showDistributions: boolean =
    ('showDistributions' in pageState && pageState.showDistributions) ?? true;
  const toggleShowDistribution = () => {
    updatePageState({
      ...pageState,
      showDistributions: !showDistributions,
    });
  };

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
      name: (
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
          iconType={expandAll ? 'arrowUp' : 'arrowDown'}
        />
      ),
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: DataVisualizerTableItem) => {
        const displayName = item.displayName ?? item.fieldName;
        if (item.fieldName === undefined) return null;
        const direction = expandedRowItemIds.includes(item.fieldName) ? 'arrowUp' : 'arrowDown';
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
          return <FieldTypeIcon type={fieldType} tooltipEnabled={true} needsAria={true} />;
        },
        width: '75px',
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
            <EuiText size="s">
              <b data-test-subj={`dataVisualizerDisplayName-${item.fieldName}`}>{displayName}</b>
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
          <DocumentStat config={item} />
        ),
        sortable: (item: DataVisualizerTableItem) => item?.stats?.count,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDocumentsCount',
      },
      {
        field: 'stats.cardinality',
        name: i18n.translate('xpack.dataVisualizer.dataGrid.distinctValuesColumnName', {
          defaultMessage: 'Distinct values',
        }),
        render: (cardinality?: number) => <DistinctValues cardinality={cardinality} />,
        sortable: true,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDistinctValues',
      },
      {
        name: (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <EuiIcon type={'visBarVertical'} style={{ paddingRight: 4 }} />
            {i18n.translate('xpack.dataVisualizer.dataGrid.distributionsColumnName', {
              defaultMessage: 'Distributions',
            })}
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
                iconType={showDistributions ? 'eye' : 'eyeClosed'}
                onClick={() => toggleShowDistribution()}
                aria-label={
                  !showDistributions
                    ? i18n.translate('xpack.dataVisualizer.dataGrid.showDistributionsAriaLabel', {
                        defaultMessage: 'Show distributions',
                      })
                    : i18n.translate('xpack.dataVisualizer.dataGrid.hideDistributionsAriaLabel', {
                        defaultMessage: 'Hide distributions',
                      })
                }
              />
            </EuiToolTip>
          </div>
        ),
        render: (item: DataVisualizerTableItem) => {
          if (item === undefined || showDistributions === false) return null;
          if (
            (item.type === JOB_FIELD_TYPES.KEYWORD || item.type === JOB_FIELD_TYPES.IP) &&
            item.stats?.topValues !== undefined
          ) {
            return <TopValuesPreview config={item} />;
          }

          if (item.type === JOB_FIELD_TYPES.NUMBER) {
            if (isIndexBasedFieldVisConfig(item) && item.stats?.distribution !== undefined) {
              return <IndexBasedNumberContentPreview config={item} />;
            } else {
              return <FileBasedNumberContentPreview config={item} />;
            }
          }

          if (item.type === JOB_FIELD_TYPES.BOOLEAN) {
            return <BooleanContentPreview config={item} />;
          }

          return null;
        },
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'dataVisualizerTableColumnDistribution',
      },
    ];
    return extendedColumns ? [...baseColumns, ...extendedColumns] : baseColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAll, showDistributions, updatePageState, extendedColumns]);

  const itemIdToExpandedRowMap = useMemo(() => {
    let itemIds = expandedRowItemIds;
    if (expandAll) {
      itemIds = items.map((i) => i[FIELD_NAME]).filter((f) => f !== undefined) as string[];
    }
    return getItemIdToExpandedRowMap(itemIds, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAll, items, expandedRowItemIds]);

  return (
    <EuiFlexItem data-test-subj="dataVisualizerTableContainer">
      <EuiInMemoryTable<T>
        className={'dataVisualizer'}
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
    </EuiFlexItem>
  );
};
