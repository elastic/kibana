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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { TelemetryLogic } from '../../../shared/telemetry';
import { AppLogic } from '../../app_logic';
import { ENGINE_PATH } from '../../routes';
import { generateEncodedPath } from '../../utils/encode_path_params';
import { EngineDetails } from '../engine/types';

import { MetaEnginesTableExpandedRow } from './components/meta_engines_table_expanded_row';
import { MetaEnginesTableNameColumnContent } from './components/meta_engines_table_name_column_content';
import {
  CREATED_AT_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from './engines_table';
import { MetaEnginesTableLogic } from './meta_engines_table_logic';
import { getConflictingEnginesSet } from './utils';

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

interface IItemIdToExpandedRowMap {
  [id: string]: ReactNode;
}

export interface ConflictingEnginesSets {
  [key: string]: Set<string>;
}

export const MetaEnginesTable: React.FC<EnginesTableProps> = ({
  items,
  loading,
  noItemsMessage,
  pagination,
  onChange,
  onDeleteEngine,
}) => {
  const metaEnginesTableLogic = MetaEnginesTableLogic({ metaEngines: items });
  const { expandedSourceEngines } = useValues(metaEnginesTableLogic);
  const { hideRow, fetchOrDisplayRow } = useActions(metaEnginesTableLogic);
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const {
    myRole: { canManageMetaEngines },
  } = useValues(AppLogic);

  const conflictingEnginesSets: ConflictingEnginesSets = items.reduce((accumulator, metaEngine) => {
    return {
      ...accumulator,
      [metaEngine.name]: getConflictingEnginesSet(metaEngine),
    };
  }, {});

  const itemIdToExpandedRowMap: IItemIdToExpandedRowMap = Object.keys(expandedSourceEngines).reduce(
    (accumulator, engineName) => {
      return {
        ...accumulator,
        [engineName]: (
          <MetaEnginesTableExpandedRow
            sourceEngines={expandedSourceEngines[engineName]}
            conflictingEngines={conflictingEnginesSets[engineName]}
          />
        ),
      };
    },
    {}
  );

  const sendEngineTableLinkClickTelemetry = () =>
    sendAppSearchTelemetry({
      action: 'clicked',
      metric: 'engine_table_link',
    });

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (name: string, item: EngineDetails) => (
        <MetaEnginesTableNameColumnContent
          name={name}
          item={item}
          isExpanded={!!itemIdToExpandedRowMap[name]}
          hideRow={hideRow}
          showRow={fetchOrDisplayRow}
          sendEngineTableLinkClickTelemetry={sendEngineTableLinkClickTelemetry}
        />
      ),
    },
    CREATED_AT_COLUMN,
    {
      render: () => <></>, // This is a blank column in place of the `Language` column
    },
    DOCUMENT_COUNT_COLUMN,
    FIELD_COUNT_COLUMN,
  ];

  const META_ENGINE_ACTIONS_COLUMN: EuiTableActionsColumnType<EngineDetails> = {
    name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.actions', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.manage',
          {
            defaultMessage: 'Manage',
          }
        ),
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.metaEnginesTable.action.manage.buttonDescription',
          {
            defaultMessage: 'Manage this meta engine',
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
        name: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.table.action.delete.buttonLabel',
          {
            defaultMessage: 'Delete',
          }
        ),
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.enginesOverview.metaEnginesTable.action.delete.buttonDescription',
          {
            defaultMessage: 'Delete this meta engine',
          }
        ),
        type: 'icon',
        icon: 'trash',
        color: 'danger',
        onClick: (engine) => {
          if (
            window.confirm(
              i18n.translate(
                'xpack.enterpriseSearch.appSearch.enginesOverview.metaEnginesTable.action.delete.confirmationPopupMessage',
                {
                  defaultMessage:
                    'Are you sure you want to permanently delete "{engineName}" and all of its settings?',
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

  if (canManageMetaEngines) {
    columns.push(META_ENGINE_ACTIONS_COLUMN);
  }

  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      noItemsMessage={noItemsMessage}
      itemId="name"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
    />
  );
};
