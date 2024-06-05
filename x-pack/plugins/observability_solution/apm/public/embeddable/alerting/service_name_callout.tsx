/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';

export function ServiceNameCallout() {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.apm.alertingEmbeddables.serviceName.error.toastTitle"
          defaultMessage="An error occurred when identifying the APM service name or transaction type."
        />
      }
      color="danger"
      iconType="error"
    >
      <p>
        <FormattedMessage
          id="xpack.apm.alertingEmbeddables.serviceName.error.toastDescription"
          defaultMessage="Unable to load the APM visualizations."
        />
      </p>
    </EuiCallOut>
  );
}
