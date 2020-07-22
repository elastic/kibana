/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import styled from 'styled-components';
import { EuiButtonIcon, IconType, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import { FormattedDate } from '../../../common/components/formatted_date';
import * as i18n from './translations';
import { TableItem, TableItemCallback, TableProps } from './types';

const AlignedSpinner = styled(EuiLoadingSpinner)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
  vertical-align: middle;
`;

const ActionButton: React.FC<{
  content: string;
  dataTestSubj: string;
  icon: IconType;
  isLoading: boolean;
  item: TableItem;
  onClick: TableItemCallback;
}> = ({ content, dataTestSubj, icon, item, onClick, isLoading }) => (
  <EuiToolTip content={content}>
    {isLoading ? (
      <AlignedSpinner size="m" />
    ) : (
      <EuiButtonIcon
        aria-label={content}
        data-test-subj={dataTestSubj}
        iconType={icon}
        onClick={() => onClick(item)}
      />
    )}
  </EuiToolTip>
);

export const buildColumns = (
  onExport: TableItemCallback,
  onDelete: TableItemCallback
): TableProps['columns'] => [
  {
    field: 'name',
    name: i18n.COLUMN_FILE_NAME,
    truncateText: true,
  },
  {
    field: 'created_at',
    name: i18n.COLUMN_UPLOAD_DATE,
    render: (value: ListSchema['created_at']) => (
      <FormattedDate value={value} fieldName="created_at" />
    ),
    width: '30%',
  },
  {
    field: 'created_by',
    name: i18n.COLUMN_CREATED_BY,
    truncateText: true,
    width: '20%',
  },
  {
    name: i18n.COLUMN_ACTIONS,
    actions: [
      {
        render: (item) => (
          <ActionButton
            content={i18n.ACTION_EXPORT_DESCRIPTION}
            dataTestSubj="action-export-value-list"
            icon="exportAction"
            item={item}
            onClick={onExport}
            isLoading={item.isExporting}
          />
        ),
      },
      {
        render: (item) => (
          <ActionButton
            content={i18n.ACTION_DELETE_DESCRIPTION}
            dataTestSubj="action-delete-value-list"
            icon="trash"
            item={item}
            onClick={onDelete}
            isLoading={item.isDeleting}
          />
        ),
      },
    ],
    width: '15%',
  },
];
