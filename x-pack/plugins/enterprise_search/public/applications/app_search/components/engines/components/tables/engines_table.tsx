/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  CriteriaWithPagination,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MANAGE_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../../../../../shared/constants';
import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../../../shared/telemetry';
import { AppLogic } from '../../../../app_logic';
import { UNIVERSAL_LANGUAGE } from '../../../../constants';
import { ENGINE_PATH } from '../../../../routes';
import { generateEncodedPath } from '../../../../utils/encode_path_params';
import { EngineDetails } from '../../../engine/types';

import {
  CREATED_AT_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from './shared_columns';

export const LANGUAGE_COLUMN: EuiTableFieldDataColumnType<EngineDetails> = {
  field: 'language',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.language', {
    defaultMessage: 'Language',
  }),
  dataType: 'string',
  render: (language: string) => language || UNIVERSAL_LANGUAGE,
};

interface EnginesTableProps {
  items: EngineDetails[];
  loading: boolean;
  noItemsMessage?: ReactNode;
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    hidePerPageOptions: boolean;
  };
  onChange(criteria: CriteriaWithPagination<EngineDetails>): void;
  onDeleteEngine(engine: EngineDetails): void;
}

export const EnginesTable: React.FC<EnginesTableProps> = ({
  items,
  loading,
  noItemsMessage,
  pagination,
  onChange,
  onDeleteEngine,
}) => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const {
    myRole: { canManageEngines },
  } = useValues(AppLogic);

  const sendEngineTableLinkClickTelemetry = () =>
    sendAppSearchTelemetry({
      action: 'clicked',
      metric: 'engine_table_link',
    });

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (name: string) => (
        <EuiLinkTo
          data-test-subj="EngineNameLink"
          to={generateEncodedPath(ENGINE_PATH, { engineName: name })}
          onClick={sendEngineTableLinkClickTelemetry}
        >
          {name}
        </EuiLinkTo>
      ),
    },
    CREATED_AT_COLUMN,
    LANGUAGE_COLUMN,
    DOCUMENT_COUNT_COLUMN,
    FIELD_COUNT_COLUMN,
  ];

  const ENGINE_ACTIONS_COLUMN: EuiTableActionsColumnType<EngineDetails> = {
    name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.actions', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: MANAGE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.manage.buttonDescription',
          {
            defaultMessage: 'Manage this engine',
          }
        ),
        type: 'icon',
        icon: 'eye',
        onClick: (engineDetails) => {
          sendEngineTableLinkClickTelemetry();
          navigateToUrl(generateEncodedPath(ENGINE_PATH, { engineName: engineDetails.name }));
        },
      },
      {
        name: DELETE_BUTTON_LABEL,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.buttonDescription',
          {
            defaultMessage: 'Delete this engine',
          }
        ),
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: (engine) => {
          if (
            window.confirm(
              i18n.translate(
                'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.confirmationPopupMessage',
                {
                  defaultMessage:
                    'Are you sure you want to permanently delete "{engineName}" and all of its content?',
                  values: {
                    engineName: engine.name,
                  },
                }
              )
            )
          ) {
            onDeleteEngine(engine);
          }
        },
      },
    ],
  };

  if (canManageEngines) {
    columns.push(ENGINE_ACTIONS_COLUMN);
  }

  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      noItemsMessage={noItemsMessage}
    />
  );
};
