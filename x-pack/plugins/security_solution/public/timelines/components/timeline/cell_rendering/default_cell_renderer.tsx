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

const StyledContent = styled.div<{ $isDetails: boolean }>`
  padding: ${({ $isDetails }) => ($isDetails ? '0 8px' : undefined)};
  width: 100%;
  margin: 0 auto;
`;

export const DefaultCellRenderer: React.FC<CellValueElementProps> = ({
  data,
  ecsData,
  eventId,
  header,
  isDetails,
  isDraggable,
  isTimeline,
  linkValues,
  rowRenderers,
  scopeId,
  truncate,
  asPlainText,
  context,
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
  const styledContentClassName = useMemo(
    () => (isDetails ? 'eui-textBreakWord' : 'eui-displayInlineBlock eui-textTruncate'),
    [isDetails]
  );

  const cellRenderer = useMemo(
    () => getColumnRenderer(header.id, columnRenderers, data, context).renderColumn,
    [header.id, data, context]
  );

  const Cell = useMemo(
    () =>
      cellRenderer({
        asPlainText: asPlainText ?? asPlainTextDefault,
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
        context,
      }),
    [
      asPlainText,
      header,
      ecsData,
      eventId,
      isDetails,
      asPlainTextDefault,
      values,
      context,
      isDraggable,
      linkValues,
      rowRenderers,
      scopeId,
      truncate,
      cellRenderer,
    ]
  );

  return (
    <StyledContent className={styledContentClassName} $isDetails={isDetails}>
      {Cell}
    </StyledContent>
  );
};
