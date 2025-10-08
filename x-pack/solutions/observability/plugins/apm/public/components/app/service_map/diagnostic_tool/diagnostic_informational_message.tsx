/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function DiagnosticInformationalMessage() {
  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="warning" size="s" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued" style={{ fontStyle: 'italic' }}>
          <p>
            {i18n.translate('xpack.apm.serviceMap.diagnosticResults.informationalMessage', {
              defaultMessage:
                'This information is provided for initial troubleshooting. For comprehensive analysis and further investigation, please download the full diagnostic report using the "Download report" button.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
