/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import styled from 'styled-components';
import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import { FormattedDate } from '../../../common/components/formatted_date';
import * as i18n from './translations';
import { TableItemCallback, TableProps } from './types';
import { listFormOptions } from './form';

const AlignedSpinner = styled(EuiLoadingSpinner)`
  margin: ${({ theme }) => theme.eui.euiSizeXS};
  vertical-align: middle;
`;

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
    field: 'type',
    name: i18n.COLUMN_TYPE,
    width: '15%',
    truncateText: true,
    render: (type: ListSchema['type']) => {
      const option = listFormOptions.find(({ value }) => value === type);
      return <>{option ? option.text : type}</>;
    },
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
          <EuiToolTip content={i18n.ACTION_EXPORT_DESCRIPTION}>
            {item.isExporting ? (
              <AlignedSpinner size="m" />
            ) : (
              <EuiButtonIcon
                aria-label={i18n.ACTION_EXPORT_DESCRIPTION}
                data-test-subj="action-export-value-list"
                iconType="exportAction"
                onClick={() => onExport(item)}
              />
            )}
          </EuiToolTip>
        ),
      },
      {
        render: (item) => (
          <EuiToolTip content={i18n.ACTION_DELETE_DESCRIPTION}>
            {item.isDeleting ? (
              <AlignedSpinner size="m" />
            ) : (
              <EuiButtonIcon
                aria-label={i18n.ACTION_DELETE_DESCRIPTION}
                data-test-subj={`action-delete-value-list-${item.name}`}
                iconType="trash"
                onClick={() => onDelete(item)}
              />
            )}
          </EuiToolTip>
        ),
      },
    ],
    width: '15%',
  },
];
