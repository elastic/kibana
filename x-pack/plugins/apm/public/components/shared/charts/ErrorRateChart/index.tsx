/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiTitle } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useChartsSync } from '../../../../hooks/useChartsSync';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { unit } from '../../../../style/variables';
import { asPercent } from '../../../../utils/formatters';
// @ts-ignore
import CustomPlot from '../CustomPlot';

const tickFormatY = (y?: number) => {
  return numeral(y || 0).format('0 %');
};

export const ErrorRateChart = () => {
  const { urlParams, uiFilters } = useUrlParams();
  const syncedChartsProps = useChartsSync();

  const { serviceName, start, end, errorGroupId } = urlParams;
  const { data: errorRateData = [] } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/errors/rate',
        params: {
          path: {
            serviceName,
          },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            groupId: errorGroupId,
          },
        },
      });
    }
  }, [serviceName, start, end, uiFilters, errorGroupId]);

  const combinedOnHover = useCallback(
    (hoverX: number) => {
      return syncedChartsProps.onHover(hoverX);
    },
    [syncedChartsProps]
  );

  return (
    <>
      <EuiTitle size="xs">
        <span>
          {i18n.translate('xpack.apm.errorRateChart.title', {
            defaultMessage: 'Error Rate',
          })}
        </span>
      </EuiTitle>
      <CustomPlot
        {...syncedChartsProps}
        series={[
          {
            data: errorRateData,
            type: 'line',
            color: theme.euiColorVis7,
            hideLegend: true,
            title: 'Rate',
          },
        ]}
        onHover={combinedOnHover}
        tickFormatY={tickFormatY}
        formatTooltipValue={({ y }: { y: number }) => {
          return asPercent(y, 1);
        }}
        height={unit * 10}
      />
    </>
  );
};
