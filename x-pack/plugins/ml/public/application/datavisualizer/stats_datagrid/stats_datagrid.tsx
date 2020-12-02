/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import {
  CENTER_ALIGNMENT,
  EuiButtonIcon,
  EuiIcon,
  EuiInMemoryTable,
  EuiScreenReaderOnly,
  EuiText,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTableComputedColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { FieldTypeIcon } from '../../components/field_type_icon';
import { FieldVisConfig } from '../index_based/common';
import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';
import { DataVisualizerFieldExpandedRow } from './expanded_row';
import { DocumentStat } from './components/field_data_column/document_stats';
import { DistinctValues } from './components/field_data_column/distinct_values';
import { NumberContentPreview } from './components/field_data_column/number_content_preview';
import { DataVisualizerIndexBasedAppState } from '../../../../common/types/ml_url_generator';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
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
    const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
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
      setExpandedRowItemIds([...expandedRowItemIds]);
    } else {
      expandedRowItemIds.push(item.fieldName);
    }

    // spread to a new array otherwise the component wouldn't re-render
    setExpandedRowItemIds([...expandedRowItemIds]);
  }

  const expanderColumn: EuiTableComputedColumnType<FieldVisConfig> = {
    name: (
      <EuiScreenReaderOnly>
        <p>
          <FormattedMessage
            id="xpack.ml.datavisualizer.dataGrid.showDetailsColumn.screenReaderDescription"
            defaultMessage="This column contains clickable controls for showing more details on each job"
          />
        </p>
      </EuiScreenReaderOnly>
    ),
    align: RIGHT_ALIGNMENT,
    width: '40px',
    isExpander: true,
    render: (item: FieldVisConfig) => {
      if (item.fieldName === undefined) return null;
      return (
        <EuiButtonIcon
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
          iconType={expandedRowItemIds.includes(item.fieldName) ? 'arrowUp' : 'arrowDown'}
        />
      );
    },
    'data-test-subj': 'mlAnalyticsTableRowDetailsToggle',
  };

  const columns = [
    expanderColumn,
    {
      field: 'type',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.typeColumnName', {
        defaultMessage: 'Type',
      }),
      render: (fieldType: ML_JOB_FIELD_TYPES) => {
        return <FieldTypeIcon type={fieldType} tooltipEnabled={true} needsAria={true} />;
      },
      'data-test-subj': 'mlDataVisualizerGridColumnId',
      width: '75px',
      sortable: true,
      align: CENTER_ALIGNMENT,
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
      'data-test-subj': 'mlDataVisualizerGridColumnJobs',
    },
    {
      field: 'docCount',
      name: (
        <div>
          <EuiIcon type={'document'} style={{ paddingRight: 5 }} />
          {i18n.translate('xpack.ml.datavisualizer.dataGrid.documentsColumnName', {
            defaultMessage: 'Documents (%)',
          })}
        </div>
      ),
      render: (value: number | undefined, item: FieldVisConfig) => <DocumentStat config={item} />,
      sortable: (item: FieldVisConfig) => item?.stats?.count,
    },
    {
      field: 'stats.cardinality',
      name: (
        <div>
          <EuiIcon type={'database'} style={{ paddingRight: 5 }} />
          {i18n.translate('xpack.ml.datavisualizer.dataGrid.distinctValuesColumnName', {
            defaultMessage: 'Distinct values',
          })}
        </div>
      ),
      render: (cardinality?: number) => <DistinctValues cardinality={cardinality} />,
      sortable: true,
    },
    {
      name: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EuiIcon type={'visBarVertical'} style={{ paddingRight: 5 }} />
          {i18n.translate('xpack.ml.datavisualizer.dataGrid.distributionsColumnName', {
            defaultMessage: 'Distributions',
          })}
          <EuiButtonIcon
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
        if (item.type === 'number' && item.stats?.distribution !== undefined) {
          return <NumberContentPreview config={item} />;
        }
        return null;
      },
    },
  ];

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, items);

  return (
    <div data-test-subj="mlCalendarTableContainer">
      <EuiInMemoryTable<FieldVisConfig>
        items={items}
        itemId={'fieldName'}
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
    </div>
  );
};
