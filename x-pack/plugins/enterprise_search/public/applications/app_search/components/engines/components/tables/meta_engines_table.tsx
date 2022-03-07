/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { AppLogic } from '../../../../app_logic';
import { EngineDetails } from '../../../engine/types';

import { AuditLogsModalLogic } from '../audit_logs_modal/audit_logs_modal_logic';

import { renderLastChangeLink } from './engine_link_helpers';
import { MetaEnginesTableExpandedRow } from './meta_engines_table_expanded_row';
import { MetaEnginesTableLogic } from './meta_engines_table_logic';
import { MetaEnginesTableNameColumnContent } from './meta_engines_table_name_column_content';
import {
  ACTIONS_COLUMN,
  BLANK_COLUMN,
  CREATED_AT_COLUMN,
  LAST_UPDATED_COLUMN,
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
}) => {
  const { expandedSourceEngines } = useValues(MetaEnginesTableLogic);
  const { hideRow, fetchOrDisplayRow } = useActions(MetaEnginesTableLogic);
  const {
    myRole: { canManageMetaEngines },
  } = useValues(AppLogic);

  const { showModal: showAuditLogModal } = useActions(AuditLogsModalLogic);

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

  const columns: Array<EuiBasicTableColumn<EngineDetails>> = [
    {
      ...NAME_COLUMN,
      render: (_, item: EngineDetails) => (
        <MetaEnginesTableNameColumnContent
          item={item}
          isExpanded={!!itemIdToExpandedRowMap[item.name]}
          hideRow={hideRow}
          showRow={fetchOrDisplayRow}
        />
      ),
    },
    CREATED_AT_COLUMN,
    {
      ...LAST_UPDATED_COLUMN,
      render: (dateString: string, engineDetails) => {
        return renderLastChangeLink(dateString, () => {
          showAuditLogModal(engineDetails.name);
        });
      },
    },
    BLANK_COLUMN,
    DOCUMENT_COUNT_COLUMN,
    FIELD_COUNT_COLUMN,
  ];

  if (canManageMetaEngines) {
    columns.push(ACTIONS_COLUMN);
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
