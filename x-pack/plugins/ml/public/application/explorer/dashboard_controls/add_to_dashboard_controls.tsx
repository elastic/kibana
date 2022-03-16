/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import {
  EuiButtonEmpty,
  EuiFormRow,
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DashboardItem, EuiTableProps, useDashboardTable } from './use_dashboards_table';

interface AddToDashboardControlProps extends ReturnType<typeof useDashboardTable> {
  onClose: (callback?: () => Promise<void>) => void;
  addToDashboardAndEditCallback: (dashboardItem: DashboardItem) => Promise<void>;
  title: React.ReactNode;
  disabled: boolean;
  children?: React.ReactElement;
}
export const AddToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  dashboardItems,
  isLoading,
  search,
  addToDashboardAndEditCallback,
  title,
  disabled,
  children,
}) => {
  const columns: EuiTableProps['columns'] = [
    {
      field: 'title',
      name: i18n.translate('xpack.ml.explorer.dashboardsTable.titleColumnHeader', {
        defaultMessage: 'Title',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.explorer.dashboardsTable.descriptionColumnHeader', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.ml.explorer.dashboardsTable.actionsHeader', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.ml.explorer.dashboardsTable.editActionName', {
            defaultMessage: 'Add to dashboard',
          }),
          description: i18n.translate('xpack.ml.explorer.dashboardsTable.editActionName', {
            defaultMessage: 'Add to dashboard',
          }),
          icon: 'documentEdit',
          type: 'icon',
          enabled: () => !disabled,
          onClick: async (item) => {
            await addToDashboardAndEditCallback(item);
          },
          'data-test-subj': 'mlEmbeddableAddAndEditDashboard',
        },
      ],
    },
  ];

  return (
    <EuiModal onClose={onClose.bind(null, undefined)} data-test-subj="mlAddToDashboardModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {children}
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.ml.explorer.addToDashboard.selectDashboardsLabel"
              defaultMessage="Select dashboards:"
            />
          }
          data-test-subj="mlDashboardSelectionContainer"
        >
          <EuiInMemoryTable
            itemId="id"
            isSelectable={false}
            hasActions={true}
            items={dashboardItems}
            loading={isLoading}
            columns={columns}
            search={search}
            pagination={true}
            sorting={true}
            data-test-subj={`mlDashboardSelectionTable${isLoading ? ' loading' : ' loaded'}`}
            rowProps={(item) => ({
              'data-test-subj': `mlDashboardSelectionTableRow row-${item.id}`,
            })}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose.bind(null, undefined)}>
          <FormattedMessage
            id="xpack.ml.explorer.addToDashboard.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
