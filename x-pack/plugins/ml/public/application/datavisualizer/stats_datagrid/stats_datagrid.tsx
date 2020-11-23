/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore @TODO: remove this after merging Pete's pR
import { FieldTypeIcon } from '../../components/field_type_icon';
import { FieldVisConfig } from '../index_based/common';

interface DataVisualizerDataGrid {
  items: any[];
}

export type DataVisualizerListRow = FieldVisConfig;
export const DataVisualizerDataGrid = ({ items }: DataVisualizerDataGrid) => {
  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20],
  };

  const columns = [
    {
      field: 'type',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.typeColumnName', {
        defaultMessage: 'Type',
      }),
      sortable: true,
      truncateText: true,
      scope: 'row',
      render: (fieldType: string) => {
        return <FieldTypeIcon type={fieldType} tooltipEnabled={false} needsaria={true} />;
      },
      'data-test-subj': 'mlDataVisualizerGridColumnId',
      width: 50,
    },
    {
      field: 'fieldName',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.nameColumnName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      truncateText: true,
      'data-test-subj': 'mlDataVisualizerGridColumnJobs',
    },
    {
      field: 'stats.count',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.documentsColumnName', {
        defaultMessage: 'Documents (%)',
      }),
      sortable: true,
    },
    {
      field: 'stats.cardinality',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.distinctValuesColumnName', {
        defaultMessage: 'Distinct values',
      }),
      sortable: true,
    },
    {
      field: 'distributions',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.distrbutionsColumnName', {
        defaultMessage: 'Distributions',
      }),
      render: () => <div />,
    },

    {
      field: 'actions',
      name: i18n.translate('xpack.ml.datavisualizer.dataGrid.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [],
    },
  ];

  return (
    <div data-test-subj="mlCalendarTableContainer">
      <EuiInMemoryTable<FieldVisConfig>
        items={items}
        itemId="calendar_id"
        columns={columns}
        pagination={pagination}
        sorting={true}
        isSelectable={true}
        data-test-subj={'mlDataVisualizerTable'}
        rowProps={(item) => ({
          'data-test-subj': `mlDataVisualizerRow row-${item.fieldName}`,
        })}
      />
    </div>
  );
};
