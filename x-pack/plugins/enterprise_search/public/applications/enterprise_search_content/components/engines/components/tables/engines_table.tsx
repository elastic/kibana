/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { CriteriaWithPagination, EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EnterpriseSearchEngine } from '../../../../../../../common/types/engines';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { ENGINE_PATH } from '../../../../routes';

import { convertMetaToPagination, Meta } from '../../types';

// add health status
interface EnginesListTableProps {
  enginesList: EnterpriseSearchEngine[];
  isLoading?: boolean;
  loading: boolean;
  meta: Meta;
  onChange: (criteria: CriteriaWithPagination<EnterpriseSearchEngine>) => void;
  onDelete: (engine: EnterpriseSearchEngine) => void;
}
export const EnginesListTable: React.FC<EnginesListTableProps> = ({
  enginesList,
  isLoading,
  meta,
  onChange,
  onDelete,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const columns: Array<EuiBasicTableColumn<EnterpriseSearchEngine>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.name', {
        defaultMessage: 'Engine Name',
      }),
      mobileOptions: {
        header: true,
        enlarge: true,
        width: '100%',
      },
      render: (name: string) => (
        <EuiLinkTo
          data-test-subj="engine-link"
          to={generateEncodedPath(ENGINE_PATH, { engineName: name })}
        >
          {name}
        </EuiLinkTo>
      ),
      truncateText: true,
      width: '30%',
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
          description: i18n.translate(
            'xpack.enterpriseSearch.content.enginesList.table.column.actions.view.buttonDescription',
            {
              defaultMessage: 'View this engine',
            }
          ),
          type: 'icon',
          icon: 'eye',
          onClick: (engine) =>
            navigateToUrl(
              generateEncodedPath(ENGINE_PATH, {
                engineName: engine.name,
              })
            ),
        },
        {
          color: 'danger',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.enginesList.table.column.action.delete.buttonDescription',
            {
              defaultMessage: 'Delete this engine',
            }
          ),
          type: 'icon',
          icon: 'trash',
          isPrimary: false,
          name: () =>
            i18n.translate(
              'xpack.enterpriseSearch.content.engineList.table.column.actions.deleteEngineLabel',
              {
                defaultMessage: 'Delete this engine',
              }
            ),
          onClick: (engine) => {
            onDelete(engine);
          },
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
