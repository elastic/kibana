/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import React, { useMemo } from 'react';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { SummaryView } from './summary_view';
import { getSummaryColumns, SummaryRow, ThreatSummaryRow } from './helpers';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';

const getDescription = ({
  contextId,
  eventId,
  fieldName,
  values,
}: ThreatSummaryRow['description']): JSX.Element => (
  <>
    {values.map((value: string) => (
      <FormattedFieldValue
        key={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}-key`}
        contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
        eventId={eventId}
        fieldName={fieldName}
        value={value}
      />
    ))}
  </>
);

const getSummaryRows = ({
  data,
  timelineId: contextId,
  eventId,
}: {
  data: TimelineEventsDetailsItem[];
  browserFields?: BrowserFields;
  timelineId: string;
  eventId: string;
}) => {
  if (!data) return [];
  return data.reduce<SummaryRow[]>((acc, { field, originalValue }) => {
    if (field.startsWith(`${INDICATOR_DESTINATION_PATH}.`) && originalValue) {
      return [
        ...acc,
        {
          title: field.replace(`${INDICATOR_DESTINATION_PATH}.`, ''),
          description: {
            values: Array.isArray(originalValue) ? originalValue : [originalValue],
            contextId,
            eventId,
            fieldName: field,
          },
        },
      ];
    }
    return acc;
  }, []);
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(getDescription);

const ThreatSummaryViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId }) => {
  const summaryRows = useMemo(() => getSummaryRows({ data, eventId, timelineId }), [
    data,
    eventId,
    timelineId,
  ]);

  return (
    <SummaryView
      summaryColumns={summaryColumns}
      summaryRows={summaryRows}
      dataTestSubj="threat-summary-view"
    />
  );
};

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
