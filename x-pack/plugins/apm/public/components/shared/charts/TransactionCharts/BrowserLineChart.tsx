/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAvgDurationByBrowser } from '../../../../hooks/useAvgDurationByBrowser';
import { getDurationFormatter } from '../../../../utils/formatters';
import {
  getResponseTimeTickFormatter,
  getResponseTimeTooltipFormatter,
  getMaxY,
} from './helper';
import { TransactionLineChart } from './TransactionLineChart';

export function BrowserLineChart() {
  const { data } = useAvgDurationByBrowser();
  const maxY = getMaxY(data);
  const formatter = getDurationFormatter(maxY);
  const formatTooltipValue = getResponseTimeTooltipFormatter(formatter);
  const tickFormatY = getResponseTimeTickFormatter(formatter);

  return (
    <>
      <EuiTitle size="xs">
        <span>
          {i18n.translate(
            'xpack.apm.metrics.pageLoadCharts.avgPageLoadByBrowser',
            {
              defaultMessage: 'Avg. page load duration distribution by browser',
            }
          )}
        </span>
      </EuiTitle>
      <TransactionLineChart
        formatTooltipValue={formatTooltipValue}
        series={data}
        tickFormatY={tickFormatY}
      />
    </>
  );
}
