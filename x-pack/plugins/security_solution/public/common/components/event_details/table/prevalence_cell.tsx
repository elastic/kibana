/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { TimelineId } from '../../../../../common/types';
import type { AlertSummaryRow } from '../helpers';
import { getEmptyTagValue } from '../../empty_value';
import { InvestigateInTimelineButton } from './investigate_in_timeline_button';
import { useActionCellDataProvider } from './use_action_cell_data_provider';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';

/**
 * Renders a Prevalence cell based on a regular alert prevalence query
 */
const PrevalenceCell: React.FC<AlertSummaryRow['description']> = ({
  data,
  eventId,
  fieldFromBrowserField,
  linkValue,
  scopeId,
  values,
}) => {
  const { loading, count } = useAlertPrevalence({
    field: data.field,
    isActiveTimelines: scopeId === TimelineId.active,
    value: values,
    signalIndexName: null,
  });

  const cellDataProviders = useActionCellDataProvider({
    contextId: scopeId,
    eventId,
    field: data.field,
    fieldFormat: data.format,
    fieldFromBrowserField,
    fieldType: data.type,
    isObjectArray: data.isObjectArray,
    linkValue,
    values,
  });

  if (loading) {
    return <EuiLoadingSpinner />;
  } else if (
    typeof count === 'number' &&
    cellDataProviders?.dataProviders &&
    cellDataProviders?.dataProviders.length
  ) {
    return (
      <InvestigateInTimelineButton
        asEmptyButton={true}
        dataProviders={cellDataProviders.dataProviders}
      >
        <span data-test-subj="alert-prevalence">{count}</span>
      </InvestigateInTimelineButton>
    );
  } else {
    return getEmptyTagValue();
  }
};

PrevalenceCell.displayName = 'PrevalenceCell';

export const PrevalenceCellRenderer = (data: AlertSummaryRow['description']) => (
  <PrevalenceCell {...data} />
);
