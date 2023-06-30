/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../cell_actions';
import { FieldValueCell } from './field_value_cell';
import type { AlertSummaryRow } from '../helpers';
import { hasHoverOrRowActions } from '../helpers';
import { TimelineId } from '../../../../../common/types';
import { getSourcererScopeId } from '../../../../helpers';

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
        <SecurityCellActions
          data={{
            field: data.field,
            value: values,
          }}
          triggerId={SecurityCellActionsTrigger.DETAILS_FLYOUT}
          mode={CellActionsMode.INLINE}
          visibleCellActions={3}
          sourcererScopeId={getSourcererScopeId(scopeId)}
          metadata={{ scopeId }}
        />
      )}
    </>
  );
};

SummaryValueCell.displayName = 'SummaryValueCell';
