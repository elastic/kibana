/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EnterpriseSearchEngine } from '../../../../../../../common/types/engines';
import { MANAGE_BUTTON_LABEL } from '../../../../../shared/constants';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { FormattedDateTime } from '../../../../../shared/formatted_date_time';
import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { ENGINE_PATH } from '../../../../routes';

import { convertMetaToPagination, Meta } from '../../types';

interface EnginesListTableProps {
  enginesList: EnterpriseSearchEngine[];
  isLoading?: boolean;
  loading: boolean;
  meta: Meta;
  onChange: (criteria: CriteriaWithPagination<EnterpriseSearchEngine>) => void;
  onDelete: (engine: EnterpriseSearchEngine) => void;
  viewEngineIndices: (engineName: string) => void;
}
export const EnginesListTable: React.FC<EnginesListTableProps> = ({
  enginesList,
  isLoading,
  meta,
  onChange,
  onDelete,
  viewEngineIndices,
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
          data-telemetry-id="entSearchContent-engines-table-viewEngine"
          to={generateEncodedPath(ENGINE_PATH, { engineName: name })}
        >
          {name}
        </EuiLinkTo>
      ),
      truncateText: true,
      width: '30%',
    },
    {
      field: 'updated',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.lastUpdated', {
        defaultMessage: 'Last updated',
      }),
      dataType: 'string',
      render: (dateString: string) => <FormattedDateTime date={new Date(dateString)} hideTime />,
    },
    {
      field: 'indices',
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.indices', {
        defaultMessage: 'Indices',
      }),
      align: 'right',

      render: (indices: string[], engine) => (
        <EuiButtonEmpty
          size="s"
          className="engineListTableFlyoutButton"
          data-test-subj="engineListTableIndicesFlyoutButton"
          onClick={() => viewEngineIndices(engine.name)}
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.content.enginesList.table.column.view.indices"
            defaultMessage="{indicesLength} indices"
            values={{
              indicesLength: indices.length,
            }}
          />
        </EuiButtonEmpty>
      ),
    },

    {
      name: i18n.translate('xpack.enterpriseSearch.content.enginesList.table.column.actions', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: MANAGE_BUTTON_LABEL,
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
