/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { TelemetryLogic } from '../../../../../shared/telemetry';
import { AppLogic } from '../../../../app_logic';
import { ENGINE_PATH } from '../../../../routes';
import { generateEncodedPath } from '../../../../utils/encode_path_params';
import { EngineDetails } from '../../../engine/types';

import { MetaEnginesTableExpandedRow } from './meta_engines_table_expanded_row';
import { MetaEnginesTableLogic } from './meta_engines_table_logic';
import { MetaEnginesTableNameColumnContent } from './meta_engines_table_name_column_content';
import {
  BLANK_COLUMN,
  CREATED_AT_COLUMN,
  DOCUMENT_COUNT_COLUMN,
  FIELD_COUNT_COLUMN,
  NAME_COLUMN,
} from './shared_columns';
import { EnginesTableProps } from './types';
import { getConflictingEnginesSet } from './utils';

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
  const { expandedSourceEngines } = useValues(MetaEnginesTableLogic);
  const { hideRow, fetchOrDisplayRow } = useActions(MetaEnginesTableLogic);
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const {
    myRole: { canManageMetaEngines },
  } = useValues(AppLogic);

  const conflictingEnginesSets: ConflictingEnginesSets = useMemo(
    () =>
      items.reduce((accumulator, metaEngine) => {
        return {
          ...accumulator,
          [metaEngine.name]: getConflictingEnginesSet(metaEngine),
        };
      }, {}),
    [items]
  );

  const itemIdToExpandedRowMap: IItemIdToExpandedRowMap = useMemo(
    () =>
      Object.keys(expandedSourceEngines).reduce((accumulator, engineName) => {
        return {
          ...accumulator,
          [engineName]: (
            <MetaEnginesTableExpandedRow
              sourceEngines={expandedSourceEngines[engineName]}
              conflictingEngines={conflictingEnginesSets[engineName]}
            />
          ),
        };
      }, {}),
    [expandedSourceEngines, conflictingEnginesSets]
  );

  const sendEngineTableLinkClickTelemetry = () =>
    sendAppSearchTelemetry({
      action: 'clicked',
      metric: 'engine_table_link',
    });

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (_, item: EngineDetails) => (
        <MetaEnginesTableNameColumnContent
          item={item}
          isExpanded={!!itemIdToExpandedRowMap[item.name]}
          hideRow={hideRow}
          showRow={fetchOrDisplayRow}
          sendEngineTableLinkClickTelemetry={sendEngineTableLinkClickTelemetry}
        />
      ),
    },
    CREATED_AT_COLUMN,
    BLANK_COLUMN,
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
