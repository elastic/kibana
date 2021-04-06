/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { I18LABELS } from '../translations';
import { getPercentileLabel } from '../UXMetrics/translations';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { Metrics } from './Metrics';

export function ClientMetrics() {
  const {
    urlParams: { percentile },
  } = useUrlParams();

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1} data-cy={`client-metrics`}>
          <EuiTitle size="xs">
            <h3>
              {I18LABELS.pageLoad} ({getPercentileLabel(percentile!)})
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <Metrics />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
