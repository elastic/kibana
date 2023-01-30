/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import { useGetMappedNonEcsValue } from '../body/data_driven_columns';
import { columnRenderers } from '../body/renderers';
import { getColumnRenderer } from '../body/renderers/get_column_renderer';
import type { CellValueElementProps } from '.';
import { getLinkColumnDefinition } from '../../../../common/lib/cell_actions/helpers';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../../../common/lib/cell_actions/constants';
import { ExpandedCellValueActions } from '../../../../common/lib/cell_actions/expanded_cell_value_actions';

const hasCellActions = (columnId?: string) => {
  return columnId && !FIELDS_WITHOUT_CELL_ACTIONS.includes(columnId);
};

const StyledContent = styled.div<{ $isDetails: boolean }>`
  padding: ${({ $isDetails }) => ($isDetails ? '0 8px' : undefined)};
`;

export const DefaultCellRenderer: React.FC<CellValueElementProps> = ({
  data,
  ecsData,
  eventId,
  globalFilters,
  header,
  isDetails,
  isDraggable,
  isTimeline,
  linkValues,
  rowRenderers,
  scopeId,
  truncate,
  enableActions = true,
  asPlainText,
}) => {
  const asPlainTextDefault = useMemo(() => {
    return (
      getLinkColumnDefinition(header.id, header.type, header.linkField) !== undefined && !isTimeline
    );
  }, [header.id, header.linkField, header.type, isTimeline]);

  const values = useGetMappedNonEcsValue({
    data,
    fieldName: header.id,
  });
  const styledContentClassName = isDetails
    ? 'eui-textBreakWord'
    : 'eui-displayInlineBlock eui-textTruncate';
  return (
    <>
      <StyledContent className={styledContentClassName} $isDetails={isDetails}>
        {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
          asPlainText: asPlainText ?? asPlainTextDefault, // we want to render value with links as plain text but keep other formatters like badge. Except rule name for non preview tables
          columnName: header.id,
          ecsData,
          eventId,
          field: header,
          isDetails,
          isDraggable,
          linkValues,
          rowRenderers,
          scopeId,
          truncate,
          values,
        })}
      </StyledContent>
      {enableActions && isDetails && hasCellActions(header.id) && (
        <ExpandedCellValueActions
          field={header}
          globalFilters={globalFilters}
          scopeId={scopeId}
          value={values}
        />
      )}
    </>
  );
};
