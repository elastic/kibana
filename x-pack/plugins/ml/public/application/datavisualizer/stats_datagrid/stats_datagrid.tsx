/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiButtonIcon,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  HorizontalAlignment,
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiTableComputedColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { FieldTypeIcon } from '../../components/field_type_icon';
import { FieldVisConfig } from '../index_based/common';
import { DataVisualizerFieldExpandedRow } from './expanded_row';
import { DocumentStat } from './components/field_data_row/document_stats';
import { DistinctValues } from './components/field_data_row/distinct_values';
import { NumberContentPreview } from './components/field_data_row/number_content_preview';
import { DataVisualizerIndexBasedAppState } from '../../../../common/types/ml_url_generator';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { TopValuesPreview } from './components/field_data_row/top_values_preview';
import type { MlJobFieldType } from '../../../../common/types/field_types';
const FIELD_NAME = 'fieldName';

interface DataVisualizerDataGrid {
  items: FieldVisConfig[];
  pageState: DataVisualizerIndexBasedAppState;
  updatePageState: (update: Partial<DataVisualizerIndexBasedAppState>) => void;
}

export type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

function getItemIdToExpandedRowMap(
  itemIds: string[],
  items: FieldVisConfig[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
    const item = items.find((fieldVisConfig) => fieldVisConfig[FIELD_NAME] === fieldName);
    if (item !== undefined) {
      m[fieldName] = <DataVisualizerFieldExpandedRow item={item} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

export const DataVisualizerDataGrid = ({
  items,
  pageState,
  updatePageState,
}: DataVisualizerDataGrid) => {
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<string[]>([]);
  const [expandAll, toggleExpandAll] = useState<boolean>(false);

  const { onTableChange, pagination, sorting } = useTableSettings<FieldVisConfig>(
    items,
    pageState,
    updatePageState
  );
  const showDistributions: boolean = pageState.showDistributions ?? true;
  const toggleShowDistribution = () => {
    updatePageState({
      ...pageState,
      showDistributions: !showDistributions,
    });
  };

  function toggleDetails(item: FieldVisConfig) {
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
    const expanderColumn: EuiTableComputedColumnType<FieldVisConfig> = {
      name: (
        <EuiButtonIcon
          data-test-subj={`mlToggleDetailsForAllRowsButton ${expandAll ? 'expanded' : 'collapsed'}`}
          onClick={() => toggleExpandAll(!expandAll)}
          aria-label={
            !expandAll
              ? i18n.translate('xpack.ml.datavisualizer.dataGrid.expandDetailsForAllAriaLabel', {
                  defaultMessage: 'Expand details for all fields',
                })
              : i18n.translate('xpack.ml.datavisualizer.dataGrid.collapseDetailsForAllAriaLabel', {
                  defaultMessage: 'Collapse details for all fields',
                })
          }
          iconType={expandAll ? 'arrowUp' : 'arrowDown'}
        />
      ),
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: FieldVisConfig) => {
        if (item.fieldName === undefined) return null;
        const direction = expandedRowItemIds.includes(item.fieldName) ? 'arrowUp' : 'arrowDown';
        return (
          <EuiButtonIcon
            data-test-subj={`mlDataVisualizerDetailsToggle-${item.fieldName}-${direction}`}
            onClick={() => toggleDetails(item)}
            aria-label={
              expandedRowItemIds.includes(item.fieldName)
                ? i18n.translate('xpack.ml.datavisualizer.dataGrid.rowCollapse', {
                    defaultMessage: 'Hide details for {fieldName}',
                    values: { fieldName: item.fieldName },
                  })
                : i18n.translate('xpack.ml.datavisualizer.dataGrid.rowExpand', {
                    defaultMessage: 'Show details for {fieldName}',
                    values: { fieldName: item.fieldName },
                  })
            }
            iconType={direction}
          />
        );
      },
      'data-test-subj': 'mlDataVisualizerTableColumnDetailsToggle',
    };

    return [
      expanderColumn,
      {
        field: 'type',
        name: i18n.translate('xpack.ml.datavisualizer.dataGrid.typeColumnName', {
          defaultMessage: 'Type',
        }),
        render: (fieldType: MlJobFieldType) => {
          return <FieldTypeIcon type={fieldType} tooltipEnabled={true} needsAria={true} />;
        },
        width: '75px',
        sortable: true,
        align: CENTER_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'mlDataVisualizerTableColumnType',
      },
      {
        field: 'fieldName',
        name: i18n.translate('xpack.ml.datavisualizer.dataGrid.nameColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: true,
        render: (fieldName: string) => (
          <EuiText size="s">
            <b>{fieldName}</b>
          </EuiText>
        ),
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'mlDataVisualizerTableColumnName',
      },
      {
        field: 'docCount',
        name: i18n.translate('xpack.ml.datavisualizer.dataGrid.documentsCountColumnName', {
          defaultMessage: 'Documents (%)',
        }),
        render: (value: number | undefined, item: FieldVisConfig) => <DocumentStat config={item} />,
        sortable: (item: FieldVisConfig) => item?.stats?.count,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'mlDataVisualizerTableColumnDocumentsCount',
      },
      {
        field: 'stats.cardinality',
        name: i18n.translate('xpack.ml.datavisualizer.dataGrid.distinctValuesColumnName', {
          defaultMessage: 'Distinct values',
        }),
        render: (cardinality?: number) => <DistinctValues cardinality={cardinality} />,
        sortable: true,
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'mlDataVisualizerTableColumnDistinctValues',
      },
      {
        name: (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <EuiIcon type={'visBarVertical'} style={{ paddingRight: 4 }} />
            {i18n.translate('xpack.ml.datavisualizer.dataGrid.distributionsColumnName', {
              defaultMessage: 'Distributions',
            })}
            <EuiButtonIcon
              style={{ marginLeft: 4 }}
              size={'s'}
              iconType={showDistributions ? 'eye' : 'eyeClosed'}
              onClick={() => toggleShowDistribution()}
              aria-label={i18n.translate(
                'xpack.ml.datavisualizer.dataGrid.showDistributionsAriaLabel',
                {
                  defaultMessage: 'Show distributions',
                }
              )}
            />
          </div>
        ),
        render: (item: FieldVisConfig) => {
          if (item === undefined || showDistributions === false) return null;
          if (item.type === 'keyword' && item.stats?.topValues !== undefined) {
            return <TopValuesPreview config={item} />;
          }

          if (item.type === 'number' && item.stats?.distribution !== undefined) {
            return <NumberContentPreview config={item} />;
          }
          return null;
        },
        align: LEFT_ALIGNMENT as HorizontalAlignment,
        'data-test-subj': 'mlDataVisualizerTableColumnDistribution',
      },
    ];
  }, [expandAll, showDistributions, updatePageState]);

  const itemIdToExpandedRowMap = useMemo(() => {
    let itemIds = expandedRowItemIds;
    if (expandAll) {
      itemIds = items.map((i) => i[FIELD_NAME]).filter((f) => f !== undefined) as string[];
    }
    return getItemIdToExpandedRowMap(itemIds, items);
  }, [expandAll, items, expandedRowItemIds]);

  return (
    <EuiFlexItem data-test-subj="mlDataVisualizerTableContainer">
      <EuiInMemoryTable<FieldVisConfig>
        className={'mlDataVisualizer'}
        items={items}
        itemId={FIELD_NAME}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        isExpandable={true}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        isSelectable={false}
        onTableChange={onTableChange}
        data-test-subj={'mlDataVisualizerTable'}
        rowProps={(item) => ({
          'data-test-subj': `mlDataVisualizerRow row-${item.fieldName}`,
        })}
      />
    </EuiFlexItem>
  );
};
