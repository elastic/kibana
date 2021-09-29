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

export const DefaultCellRenderer: React.FC<CellValueElementProps> = ({
  browserFields,
  className,
  data,
  ecsData,
  eventId,
  header,
  isDetails,
  isDraggable,
  linkValues,
  rowRenderers,
  setCellProps,
  timelineId,
}) => (
  <>
    {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
      asPlainText: !!getLink(header.id, header.type),
      className,
      columnName: header.id,
      eventId,
      field: header,
      isDraggable,
      linkValues,
      timelineId,
      truncate: true,
      values: getMappedNonEcsValue({
        data,
        fieldName: header.id,
      }),
      rowRenderers,
      browserFields,
      ecsData,
      isDetails,
    })}
  </>
);
