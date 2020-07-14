/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { mean } from 'lodash';
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
  return asPercent(y || 0, 1);
};

export const ErrorRateChart = () => {
  const { urlParams, uiFilters } = useUrlParams();
  const syncedChartsProps = useChartsSync();

  const { serviceName, start, end, errorGroupId } = urlParams;
  const { data: errorRateData } = useFetcher(() => {
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

  const errorRates = errorRateData?.errorRates || [];

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
        noHits={errorRateData?.noHits}
        series={[
          {
            color: theme.euiColorVis7,
            data: [],
            legendValue: tickFormatY(mean(errorRates.map((rate) => rate.y))),
            legendClickDisabled: true,
            title: i18n.translate('xpack.apm.errorRateChart.avgLabel', {
              defaultMessage: 'Avg.',
            }),
            type: 'linemark',
            hideTooltipValue: true,
          },
          {
            data: errorRates,
            type: 'line',
            color: theme.euiColorVis7,
            hideLegend: true,
            title: i18n.translate('xpack.apm.errorRateChart.rateLabel', {
              defaultMessage: 'Rate',
            }),
          },
        ]}
        onHover={combinedOnHover}
        tickFormatY={tickFormatY}
        formatTooltipValue={({ y }: { y?: number }) =>
          Number.isFinite(y) ? tickFormatY(y) : 'N/A'
        }
        height={unit * 10}
      />
    </>
  );
};
