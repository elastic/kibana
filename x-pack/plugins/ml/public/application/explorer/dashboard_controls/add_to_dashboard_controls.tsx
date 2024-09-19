/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import {
  EuiButton,
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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTableProps, useDashboardTable } from './use_dashboards_table';

export const columns: EuiTableProps['columns'] = [
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
];

interface AddToDashboardControlProps extends ReturnType<typeof useDashboardTable> {
  onClose: (callback?: () => Promise<void>) => void;
  addToDashboardAndEditCallback: () => Promise<void>;
  addToDashboardCallback: () => Promise<void>;
  title: React.ReactNode;
  disabled: boolean;
  children?: React.ReactElement;
}
export const AddToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  selection,
  dashboardItems,
  isLoading,
  search,
  addToDashboardAndEditCallback,
  addToDashboardCallback,
  title,
  disabled,
  children,
}) => {
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
            isSelectable={true}
            selection={selection}
            items={dashboardItems}
            loading={isLoading}
            columns={columns}
            search={search}
            pagination={true}
            sorting={true}
            data-test-subj="mlDashboardSelectionTable"
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
        <EuiButton
          disabled={disabled}
          onClick={onClose.bind(null, addToDashboardAndEditCallback)}
          data-test-subj="mlAddAndEditDashboardButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.dashboardsTable.addAndEditDashboardLabel"
            defaultMessage="Add and edit dashboard"
          />
        </EuiButton>
        <EuiButton
          fill
          onClick={onClose.bind(null, addToDashboardCallback)}
          disabled={disabled}
          data-test-subj="mlAddToDashboardsButton"
        >
          <FormattedMessage
            id="xpack.ml.explorer.dashboardsTable.addToDashboardLabel"
            defaultMessage="Add to dashboards"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
