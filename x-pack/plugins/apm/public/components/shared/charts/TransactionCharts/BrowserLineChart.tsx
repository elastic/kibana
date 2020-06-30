/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle } from '@elastic/eui';
import { TransactionLineChart } from './TransactionLineChart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
  getResponseTimeTooltipFormatter,
} from '.';
import { getDurationFormatter } from '../../../../utils/formatters';
import { useAvgDurationByBrowser } from '../../../../hooks/useAvgDurationByBrowser';

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
