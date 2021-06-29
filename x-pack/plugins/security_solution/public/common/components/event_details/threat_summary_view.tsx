/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiSpacer } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';
import { SummaryView } from './summary_view';
import { getSummaryColumns, SummaryRow, ThreatSummaryRow } from './helpers';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { SORTED_THREAT_SUMMARY_FIELDS } from '../../../../common/cti/constants';
import { INDICATOR_DESTINATION_PATH } from '../../../../common/constants';

const getThreatSummaryRows = (
  data: TimelineEventsDetailsItem[],
  timelineId: string,
  eventId: string
) =>
  SORTED_THREAT_SUMMARY_FIELDS.map((threatSummaryField) => {
    const item = data.find(({ field }) => field === threatSummaryField);
    if (item) {
      const { field, originalValue } = item;
      return {
        title: field.replace(`${INDICATOR_DESTINATION_PATH}.`, ''),
        description: {
          values: Array.isArray(originalValue) ? originalValue : [originalValue],
          contextId: timelineId,
          eventId,
          fieldName: field,
        },
      };
    }
    return null;
  }).filter((item: ThreatSummaryRow | null): item is ThreatSummaryRow => !!item);

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

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(getDescription);

const ThreatSummaryViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
  timelineId: string;
  eventId: string;
}> = ({ data, timelineId, eventId }) => (
  <>
    <EuiSpacer size="l" />
    <SummaryView
      title={i18n.THREAT_SUMMARY}
      summaryColumns={summaryColumns}
      summaryRows={getThreatSummaryRows(data, timelineId, eventId)}
      dataTestSubj="threat-summary-view"
    />
  </>
);

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
