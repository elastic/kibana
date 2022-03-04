/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Legend } from '../../../../shared/charts/timeline/legend';
import {
  IWaterfallLegend,
  WaterfallLegendType,
} from './waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  legends: IWaterfallLegend[];
  type: WaterfallLegendType;
}

const LEGEND_LABELS = {
  [WaterfallLegendType.ServiceName]: i18n.translate(
    'xpack.apm.transactionDetails.servicesTitle',
    {
      defaultMessage: 'Services',
    }
  ),
  [WaterfallLegendType.SpanType]: i18n.translate(
    'xpack.apm.transactionDetails.spanTypeLegendTitle',
    {
      defaultMessage: 'Type',
    }
  ),
};
export function WaterfallLegends({ legends, type }: Props) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>{LEGEND_LABELS[type]}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {legends.map((legend) => (
            <EuiFlexItem grow={false} key={legend.value}>
              <Legend color={legend.color} text={legend.value} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
