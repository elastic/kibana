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
import type { IWaterfallLegend } from '../../../../../../common/waterfall/legend';
import { WaterfallLegendType } from '../../../../../../common/waterfall/legend';
import { Legend } from '../../../../shared/charts/timeline/legend';

interface Props {
  serviceName?: string;
  legends: IWaterfallLegend[];
  type: WaterfallLegendType;
}

const LEGEND_LABELS = {
  [WaterfallLegendType.ServiceName]: i18n.translate('xpack.apm.transactionDetails.servicesTitle', {
    defaultMessage: 'Services',
  }),
  [WaterfallLegendType.SpanType]: i18n.translate(
    'xpack.apm.transactionDetails.spanTypeLegendTitle',
    {
      defaultMessage: 'Type',
    }
  ),
};
export function WaterfallLegends({ serviceName, legends, type }: Props) {
  const displayedLegends = legends.filter((legend) => legend.type === type);

  // default to serviceName if value is empty, e.g. for transactions (which don't
  // have span.type or span.subtype)
  const legendsWithFallbackLabel = displayedLegends.map((legend) => {
    return { ...legend, value: !legend.value ? serviceName : legend.value };
  });

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>{LEGEND_LABELS[type]}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          {legendsWithFallbackLabel.map((legend) => (
            <EuiFlexItem grow={false} key={legend.value}>
              <Legend color={legend.color} text={legend.value} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
