/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { colorTransformer } from '../../../../../../../../common/color_palette';
import { MetricsExplorerOptionsMetric } from '../../../../../metrics_explorer/hooks/use_metrics_explorer_options';

interface Props {
  title: string;
  metrics: MetricsExplorerOptionsMetric[];
}

export const ChartHeader = ({ title, metrics }: Props) => {
  return (
    <EuiFlexGroup gutterSize={'s'} responsive={false}>
      <EuiFlexItem grow={1}>
        <EuiText size={'s'}>
          <h4>{title}</h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'} responsive={false}>
          {metrics.map((chartMetric) => (
            <EuiFlexItem key={chartMetric.label!}>
              <EuiFlexGroup
                key={chartMetric.label!}
                gutterSize={'xs'}
                alignItems={'center'}
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon color={colorTransformer(chartMetric.color!)} type={'dot'} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size={'xs'}>{chartMetric.label}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
