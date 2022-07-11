/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import type { AlertSummaryRow } from '../helpers';
import { getEmptyTagValue } from '../../empty_value';
import { InvestigateInTimelineButton } from './investigate_in_timeline_button';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';

const PrevalenceCell = React.memo<AlertSummaryRow['description']>(
  ({ data, eventId, fieldFromBrowserField, linkValue, timelineId, values }) => {
    const { loading, count } = useAlertPrevalence({
      field: data.field,
      timelineId,
      value: values,
      signalIndexName: null,
    });

    if (loading) {
      return <EuiLoadingSpinner />;
    } else if (typeof count === 'number') {
      return (
        <InvestigateInTimelineButton
          data={data}
          eventId={eventId}
          fieldFromBrowserField={fieldFromBrowserField}
          linkValue={linkValue}
          timelineId={timelineId}
          values={values}
        >
          <span data-test-subj="alert-prevalence">{count}</span>
        </InvestigateInTimelineButton>
      );
    } else {
      return getEmptyTagValue();
    }
  }
);

PrevalenceCell.displayName = 'PrevalenceCell';

export const PrevalenceCellRenderer = (data: AlertSummaryRow['description']) => {
  return <PrevalenceCell {...data} />;
};
