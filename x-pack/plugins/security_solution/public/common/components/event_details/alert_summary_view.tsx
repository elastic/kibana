/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import React, { useMemo } from 'react';

import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { SummaryView } from './summary_view';
import { AlertSummaryRow, getSummaryColumns, SummaryRow } from './helpers';

import { ActionCell } from './table/action_cell';
import { FieldValueCell } from './table/field_value_cell';
import { TimelineId } from '../../../../common/types';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

import { getSummaryRows } from './get_alert_summary_rows';

const getDescription = ({
  data,
  eventId,
  fieldFromBrowserField,
  isDraggable,
  linkValue,
  timelineId,
  values,
}: AlertSummaryRow['description']) => (
  <>
    <FieldValueCell
      contextId={timelineId}
      data={data}
      eventId={eventId}
      fieldFromBrowserField={fieldFromBrowserField}
      linkValue={linkValue}
      isDraggable={isDraggable}
      values={values}
    />
    {timelineId !== TimelineId.active && (
      <ActionCell
        contextId={timelineId}
        data={data}
        eventId={eventId}
        fieldFromBrowserField={fieldFromBrowserField}
        linkValue={linkValue}
        timelineId={timelineId}
        values={values}
        applyWidthAndPadding={false}
      />
    )}
  </>
);

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(getDescription);

const AlertSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDraggable?: boolean;
  timelineId: string;
  title: string;
  goToTable: () => void;
}> = ({ browserFields, data, eventId, isDraggable, timelineId, title, goToTable }) => {
  const summaryRows = useMemo(
    () => getSummaryRows({ browserFields, data, eventId, isDraggable, timelineId }),
    [browserFields, data, eventId, isDraggable, timelineId]
  );

  return (
    <SummaryView
      summaryColumns={summaryColumns}
      summaryRows={summaryRows}
      title={title}
      goToTable={goToTable}
    />
  );
};

export const AlertSummaryView = React.memo(AlertSummaryViewComponent);
