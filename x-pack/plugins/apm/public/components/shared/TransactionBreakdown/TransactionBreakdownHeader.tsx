/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TransactionBreakdownHeader: React.FC<{
  showChart: boolean;
  onToggleClick: () => void;
}> = ({ showChart, onToggleClick }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.apm.transactionBreakdown.chartTitle', {
              defaultMessage: 'Time spent by span type'
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType={showChart ? 'arrowDown' : 'arrowRight'}
          onClick={() => onToggleClick()}
        >
          {showChart
            ? i18n.translate('xpack.apm.transactionBreakdown.hideChart', {
                defaultMessage: 'Hide chart'
              })
            : i18n.translate('xpack.apm.transactionBreakdown.showChart', {
                defaultMessage: 'Show chart'
              })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { TransactionBreakdownHeader };
