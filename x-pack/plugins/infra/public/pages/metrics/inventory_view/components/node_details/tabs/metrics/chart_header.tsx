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
import { euiStyled } from '../../../../../../../../../observability/public';

interface Props {
  title: string;
  metrics: MetricsExplorerOptionsMetric[];
}

export const ChartHeader = ({ title, metrics }: Props) => {
  return (
    <ChartHeaderWrapper>
      <EuiFlexItem style={{ flex: 1 }} grow={true}>
        <EuiText>
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
          {metrics.map((chartMetric) => (
            <EuiFlexGroup key={chartMetric.label!} gutterSize={'s'} alignItems={'center'}>
              <EuiFlexItem grow={false}>
                <EuiIcon color={colorTransformer(chartMetric.color!)} type={'dot'} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size={'xs'}>{chartMetric.label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </ChartHeaderWrapper>
  );
};

const ChartHeaderWrapper = euiStyled.div`
  display: flex;
  width: 100%;
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m};
`;
