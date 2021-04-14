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
  threatSummaryRows: ThreatSummaryRow[];
}> = ({ threatSummaryRows }) => (
  <>
    <EuiSpacer size="l" />
    <SummaryView
      title={i18n.THREAT_SUMMARY}
      summaryColumns={summaryColumns}
      summaryRows={threatSummaryRows}
      dataTestSubj="threat-summary-view"
    />
  </>
);

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
