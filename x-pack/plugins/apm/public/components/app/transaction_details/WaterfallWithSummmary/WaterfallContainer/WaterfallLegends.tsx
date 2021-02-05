/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { px, unit } from '../../../../../style/variables';
import { Legend } from '../../../../shared/charts/Legend';
import {
  IWaterfallLegend,
  WaterfallLegendType,
} from './Waterfall/waterfall_helpers/waterfall_helpers';

const Legends = styled.div`
  display: flex;

  > * {
    margin-right: ${px(unit)};
    &:last-child {
      margin-right: 0;
    }
  }
`;

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

const TRANSACTION_LABEL = i18n.translate(
  'xpack.apm.transactionDetails.spanTypeTransactionLabel',
  {
    defaultMessage: 'Transaction',
  }
);

export function WaterfallLegends({ legends, type }: Props) {
  return (
    <Legends>
      <EuiTitle size="xxxs">
        <span>{LEGEND_LABELS[type]}</span>
      </EuiTitle>
      {legends.map((legend) => (
        <Legend
          key={legend.value}
          color={legend.color}
          text={legend.value || TRANSACTION_LABEL}
        />
      ))}
    </Legends>
  );
}
