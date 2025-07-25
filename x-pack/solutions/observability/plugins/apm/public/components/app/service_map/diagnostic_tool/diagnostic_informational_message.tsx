/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function DiagnosticInformationalMessage() {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.serviceMap.diagnosticResults.informationalTitle', {
        defaultMessage: 'For detailed analysis',
      })}
      color="primary"
      iconType="iInCircle"
      size="s"
    >
      <p>
        {i18n.translate('xpack.apm.serviceMap.diagnosticResults.informationalMessage', {
          defaultMessage:
            'This information is provided for initial troubleshooting. For comprehensive analysis and further investigation, please download the full diagnostic report using the "Download report" button.',
        })}
      </p>
    </EuiCallOut>
  );
}
