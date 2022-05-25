/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionCell } from './action_cell';
import { FieldValueCell } from './field_value_cell';
import { AlertSummaryRow, hasHoverOrRowActions } from '../helpers';
import { TimelineId } from '../../../../../common/types';

const style = { flexGrow: 0 };

export const SummaryValueCell: React.FC<AlertSummaryRow['description']> = ({
  data,
  eventId,
  fieldFromBrowserField,
  isDraggable,
  linkValue,
  timelineId,
  values,
  isReadOnly,
}) => {
  const hoverActionsEnabled = hasHoverOrRowActions(data.field);

  return (
    <>
      <FieldValueCell
        contextId={timelineId}
        data={data}
        eventId={eventId}
        fieldFromBrowserField={fieldFromBrowserField}
        linkValue={linkValue}
        isDraggable={isDraggable}
        style={style}
        values={values}
      />
      {timelineId !== TimelineId.active && !isReadOnly && hoverActionsEnabled && (
        <ActionCell
          contextId={timelineId}
          data={data}
          eventId={eventId}
          fieldFromBrowserField={fieldFromBrowserField}
          linkValue={linkValue}
          timelineId={timelineId}
          values={values}
          applyWidthAndPadding={false}
          hideAddToTimeline={false}
        />
      )}
    </>
  );
};

SummaryValueCell.displayName = 'SummaryValueCell';
