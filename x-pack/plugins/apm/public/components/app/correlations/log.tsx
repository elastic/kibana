/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiCode, EuiPanel } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  log: string[];
  displayLog?: boolean;
}
export function CorrelationsLog({ log }: Props) {
  return (
    <EuiAccordion
      id="apmCorrelationsLogAccordion"
      buttonContent={i18n.translate('xpack.apm.correlations.logButtonContent', {
        defaultMessage: 'Log',
      })}
    >
      <EuiPanel color="subdued">
        {log.map((d, i) => {
          const splitItem = d.split(': ');
          return (
            <p key={i}>
              <small>
                <EuiCode>{splitItem[0]}</EuiCode> {splitItem[1]}
              </small>
            </p>
          );
        })}
      </EuiPanel>
    </EuiAccordion>
  );
}
