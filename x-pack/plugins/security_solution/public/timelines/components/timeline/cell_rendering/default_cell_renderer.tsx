/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { getMappedNonEcsValue } from '../body/data_driven_columns';
import { columnRenderers } from '../body/renderers';
import { getColumnRenderer } from '../body/renderers/get_column_renderer';

import { CellValueElementProps } from '.';
import { getLink } from '../../../../common/lib/cell_actions/default_cell_actions';
import {
  ExpandTopValue,
  StyledContent,
} from '../../../../common/lib/cell_actions/expand_top_value';

const FIELDS_WITHOUT_CELL_ACTIONS = ['@timestamp', 'signal.rule.risk_score', 'signal.reason'];
const hasCellActions = (columnId?: string) => {
  return columnId && FIELDS_WITHOUT_CELL_ACTIONS.indexOf(columnId) < 0;
};

export const DefaultCellRenderer: React.FC<CellValueElementProps> = ({
  browserFields,
  className,
  data,
  ecsData,
  eventId,
  globalFilters,
  header,
  isDetails,
  isDraggable,
  linkValues,
  rowRenderers,
  setCellProps,
  timelineId,
}) => {
  const values = getMappedNonEcsValue({
    data,
    fieldName: header.id,
  });
  const styledContentClassName = isDetails ? 'eui-textBreakWord' : '';
  return (
    <>
      <StyledContent className={styledContentClassName} $isDetails={isDetails}>
        {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
          asPlainText: !!getLink(header.id, header.type), // we want to render value with links as plain text but keep other formatters like badge.
          browserFields,
          className,
          columnName: header.id,
          eventId,
          field: header,
          isDraggable,
          linkValues,
          timelineId,
          truncate: isDetails ? false : true,
          values: getMappedNonEcsValue({
            data,
            fieldName: header.id,
          }),
          rowRenderers,
          ecsData,
          isDetails,
        })}
      </StyledContent>
      {isDetails && browserFields && hasCellActions(header.id) && (
        <ExpandTopValue
          browserFields={browserFields}
          field={header.id}
          globalFilters={globalFilters}
          timelineId={timelineId}
          value={values}
        />
      )}
    </>
  );
};
