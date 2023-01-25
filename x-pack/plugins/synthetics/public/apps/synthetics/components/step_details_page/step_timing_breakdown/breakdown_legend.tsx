/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiSpacer, EuiText } from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';

import { formatMillisecond } from '../common/network_data/data_formatting';
import { useNetworkTimings } from '../hooks/use_network_timings';

export const BreakdownLegend = () => {
  const networkTimings = useNetworkTimings();

  const theme = useTheme();

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {networkTimings.timingsWithLabels.map(({ label, value }, index) => (
          <EuiFlexGroup key={index} gutterSize="s">
            <EuiFlexItem grow={true}>
              <EuiHealth
                color={(theme.eui as unknown as Record<string, string>)[`euiColorVis${index + 1}`]}
              >
                {label}
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText css={{ whiteSpace: 'nowrap' }} size="s">
                {formatMillisecond(value, {})}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </EuiFlexGroup>
    </>
  );
};
