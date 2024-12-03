/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiButtonIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ShowValueListModal } from '../../../value_list/components/show_value_list_modal';
import { FormattedDate } from '../../../common/components/formatted_date';
import * as i18n from './translations';
import type { TableItemCallback, TableProps } from './types';
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
    truncateText: false,
    render: (name: ListSchema['name'], item: ListSchema) => (
      <ShowValueListModal shouldShowContentIfModalNotAvailable listId={item.id}>
        {name}
      </ShowValueListModal>
    ),
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
                color="danger"
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
