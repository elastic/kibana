/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { AlertSummaryRow } from '../helpers';
import { getEmptyValue } from '../../../components/empty_value';
import { useAlertPrevalence } from '../../../containers/alerts/use_alert_prevalence';

const PrevalenceCell = React.memo<AlertSummaryRow['description']>(
  ({ data, values, timelineId }) => {
    const { loading, count, error } = useAlertPrevalence({
      field: data.field,
      timelineId,
      value: values,
      signalIndexName: null,
    });

    if (loading) {
      return <EuiLoadingSpinner />;
    } else if (error) {
      return <>{getEmptyValue()}</>;
    }

    return <>{count}</>;
  }
);

PrevalenceCell.displayName = 'PrevalenceCell';

export const PrevalenceCellRenderer = (data: AlertSummaryRow['description']) => {
  return <PrevalenceCell {...data} />;
};
