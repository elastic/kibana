/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ApiKeyErrorCallout({
  errorMessage,
}: {
  errorMessage?: string;
}) {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.tutorial.apiKey.error.calloutTitle', {
        defaultMessage: 'Failed to create API key',
      })}
      color="danger"
      iconType="error"
    >
      {i18n.translate('xpack.apm.tutorial.apiKey.success.calloutMessage', {
        defaultMessage: 'Error: {errorMessage}',
        values: {
          errorMessage,
        },
      })}
    </EuiCallOut>
  );
}
