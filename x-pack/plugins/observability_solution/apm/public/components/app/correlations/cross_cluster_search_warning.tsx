/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

export function CrossClusterSearchCompatibilityWarning({
  version,
}: {
  version: string;
}) {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.correlations.ccsWarningCalloutTitle', {
        defaultMessage: 'Cross-cluster search compatibility',
      })}
      color="warning"
    >
      <p>
        {i18n.translate('xpack.apm.correlations.ccsWarningCalloutBody', {
          defaultMessage:
            'Data for the correlation analysis could not be fully retrieved. This feature is supported only for {version} and later versions.',
          values: { version },
        })}
      </p>
    </EuiCallOut>
  );
}
