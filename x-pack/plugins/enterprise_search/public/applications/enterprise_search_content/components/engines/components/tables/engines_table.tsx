/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CriteriaWithPagination, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';

import { DELETE_BUTTON_LABEL, MANAGE_BUTTON_LABEL } from '../../../../../shared/constants';

import { convertMetaToPagination, EngineListDetails, Meta } from '../../types';

// add health status
interface EnginesListTableProps {
  enginesList: EngineListDetails[];
  loading: boolean;
  meta: Meta;
  isLoading?: boolean;
  onChange: (criteria: CriteriaWithPagination<EngineListDetails>) => void;
}
export const EnginesListTable: React.FC<EnginesListTableProps> = ({
  enginesList,
  meta,
  isLoading,
  onChange,
}) => {
  const columns: Array<EuiBasicTableColumn<EngineListDetails>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.name', {
        defaultMessage: 'Engine Name',
      }),
      width: '30%',
      truncateText: true,
      mobileOptions: {
        header: true,
        enlarge: true,
        width: '100%',
      },
    },
    {
      field: 'document_count',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.documents', {
        defaultMessage: 'Documents',
      }),
      dataType: 'number',
      render: (number: number) => <FormattedNumber value={number} />,
    },
    {
      field: 'last_updated',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.lastUpdated', {
        defaultMessage: 'Last updated',
      }),
      dataType: 'string',
    },
    {
      field: 'indices.length',
      datatype: 'number',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.indices', {
        defaultMessage: 'Indices',
      }),
    },

    {
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: MANAGE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.content.enginesList.table.column.action.manage.buttonDescription',
            {
              defaultMessage: 'Manage this engine',
            }
          ),
          type: 'icon',
          icon: 'eye',
          onClick: () => {},
        },
        {
          name: DELETE_BUTTON_LABEL,
          description: i18n.translate(
            'xpack.enterpriseSearch.content.enginesList.table.column.action.delete.buttonDescription',
            {
              defaultMessage: 'Delete this engine',
            }
          ),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: () => {},
        },
      ],
    },
  ];

  return (
    <EuiBasicTable
      items={enginesList}
      columns={columns}
      pagination={{ ...convertMetaToPagination(meta), showPerPageOptions: false }}
      onChange={onChange}
      loading={isLoading}
    />
  );
};
