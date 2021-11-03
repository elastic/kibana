/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCode, EuiPanel } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';

interface Props {
  logMessages: string[];
}
export function CorrelationsLog({ logMessages }: Props) {
  return (
    <EuiAccordion
      id="apmCorrelationsLogAccordion"
      buttonContent={i18n.translate('xpack.apm.correlations.logButtonContent', {
        defaultMessage: 'Log',
      })}
    >
      <EuiPanel color="subdued">
        {logMessages.map((logMessage, i) => {
          const [timestamp, message] = logMessage.split(': ');
          return (
            <p key={i}>
              <small>
                <EuiCode>{asAbsoluteDateTime(timestamp)}</EuiCode> {message}
              </small>
            </p>
          );
        })}
      </EuiPanel>
    </EuiAccordion>
  );
}
