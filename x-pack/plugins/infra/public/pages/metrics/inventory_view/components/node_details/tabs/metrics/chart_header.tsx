/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { colorTransformer } from '../../../../../../../../common/color_palette';
import { MetricsExplorerOptionsMetric } from '../../../../../metrics_explorer/hooks/use_metrics_explorer_options';

interface Props {
  title: string;
  metrics: MetricsExplorerOptionsMetric[];
}

export const ChartHeader = ({ title, metrics }: Props) => {
  return (
    <EuiFlexGroup gutterSize={'s'} responsive={false}>
      <HeaderItem grow={1}>
        <EuiText size={'s'}>
          <H4>{title}</H4>
        </EuiText>
      </HeaderItem>
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

const HeaderItem = euiStyled(EuiFlexItem).attrs({ grow: 1 })`
  overflow: hidden;
`;

const H4 = euiStyled('h4')`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
