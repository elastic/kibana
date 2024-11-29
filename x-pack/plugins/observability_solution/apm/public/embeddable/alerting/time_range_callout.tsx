/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export function TimeRangeCallout() {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.apm.alertingEmbeddables.timeRange.error.toastTitle"
          defaultMessage="An error occurred when identifying the alert time range."
        />
      }
      color="danger"
      iconType="error"
    >
      <p>
        <FormattedMessage
          id="xpack.apm.alertingEmbeddables.timeRange.toastDescription"
          defaultMessage="Unable to load the alert details page's charts. Please try to refresh the page if the alert is newly created"
        />
      </p>
    </EuiCallOut>
  );
}
