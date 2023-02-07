/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function NoTransactionsPrompt() {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="center"
      style={{ height: '50vh' }}
    >
      <EuiFlexItem
        grow={false}
        style={{ width: 600, textAlign: 'center' as const }}
      >
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate(
                'xpack.apm.transactionsPrompt.noTransactionsAvailable.title',
                {
                  defaultMessage: 'No transactions available',
                }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.apm.transactionsPrompt.noTransactionsAvailable.description',
                {
                  defaultMessage:
                    'We can’t find any transaction within the currently selected time range and environment. Please try another range or check the environment selected.',
                }
              )}
            </p>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
