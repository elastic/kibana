/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { asPercent } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/useTheme';
import { LineChart } from '../line_chart';

interface Props {
  errorRates: any[];
}

const tickFormatY = (y?: number) => {
  return asPercent(y || 0, 1);
};

export function ErroneousTransactionsRateChartElasticChart({
  errorRates,
}: Props) {
  const theme = useTheme();

  return (
    <LineChart
      id="errorRate"
      timeseries={[
        {
          data: errorRates,
          type: 'linemark',
          color: theme.eui.euiColorVis7,
          hideLegend: true,
          title: i18n.translate('xpack.apm.errorRateChart.rateLabel', {
            defaultMessage: 'Rate',
          }),
        },
      ]}
      tickFormatY={tickFormatY}
    />
  );
}
