/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CellActions, CellActionsMode } from '@kbn/cell-actions';
import { FieldValueCell } from './field_value_cell';
import type { AlertSummaryRow } from '../helpers';
import { hasHoverOrRowActions } from '../helpers';
import { TimelineId } from '../../../../../common/types';
import { CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER } from '../../../../../common/constants';

const style = { flexGrow: 0 };

export const SummaryValueCell: React.FC<AlertSummaryRow['description']> = ({
  data,
  eventId,
  fieldFromBrowserField,
  isDraggable,
  linkValue,
  scopeId,
  values,
  isReadOnly,
}) => {
  const hoverActionsEnabled = hasHoverOrRowActions(data.field);

  return (
    <>
      <FieldValueCell
        contextId={scopeId}
        data={data}
        eventId={eventId}
        fieldFromBrowserField={fieldFromBrowserField}
        linkValue={linkValue}
        isDraggable={isDraggable}
        style={style}
        values={values}
      />
      {scopeId !== TimelineId.active && !isReadOnly && hoverActionsEnabled && (
        <CellActions
          field={{
            name: data.field,
            value: values && values.length > 0 ? values[0] : '',
            type: data.type,
            aggregatable: fieldFromBrowserField?.aggregatable,
          }}
          triggerId={CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER}
          mode={CellActionsMode.INLINE}
          visibleCellActions={3}
          metadata={{ scopeId }}
        />
      )}
    </>
  );
};

SummaryValueCell.displayName = 'SummaryValueCell';
