/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { LastUpdated } from './last_updated';
import { useSeriesStorage } from '../hooks/use_series_storage';

export function RefreshButton() {
  const { setLastRefresh, chartTimeRangeContext } = useSeriesStorage();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem style={{ textAlign: 'right', minWidth: 280 }}>
        <LastUpdated chartTimeRange={chartTimeRangeContext} />
      </EuiFlexItem>
      <EuiFlexItem style={{ textAlign: 'right' }}>
        <EuiButton
          data-test-subj="o11yRefreshButtonButton"
          iconType="refresh"
          onClick={() => setLastRefresh(Date.now())}
        >
          {REFRESH_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const REFRESH_LABEL = i18n.translate('xpack.exploratoryView.refresh', {
  defaultMessage: 'Refresh',
});
