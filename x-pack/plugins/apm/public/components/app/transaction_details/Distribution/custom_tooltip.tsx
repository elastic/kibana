/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TooltipInfo } from '@elastic/charts';
import { EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TimeFormatter } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';
import { formatYLong, IChartPoint } from './';

export function CustomTooltip(
  props: TooltipInfo & {
    serie?: IChartPoint;
    isSamplesEmpty: boolean;
    timeFormatter: TimeFormatter;
  }
) {
  const theme = useTheme();
  const { values, header, serie, isSamplesEmpty, timeFormatter } = props;
  const { color, value } = values[0];

  let headerTitle = `${timeFormatter(header?.value)}`;
  if (serie) {
    const xFormatted = timeFormatter(serie.x);
    const x0Formatted = timeFormatter(serie.x0);
    headerTitle = `${x0Formatted.value} - ${xFormatted.value} ${xFormatted.unit}`;
  }

  return (
    <div className="echTooltip">
      <>
        <div className="echTooltip__header">{headerTitle}</div>
        <div className="echTooltip__list">
          <div className="echTooltip__item">
            <div
              className="echTooltip__item--backgroundColor"
              style={{ backgroundColor: 'transparent' }}
            >
              <div
                className="echTooltip__item--color"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="echTooltip__item--container">
              <span className="echTooltip__label">{formatYLong(value)}</span>
              <span className="echTooltip__value">{value}</span>
            </div>
          </div>
        </div>
      </>
      {isSamplesEmpty && (
        <div style={{ padding: theme.eui.paddingSizes.xs, display: 'flex' }}>
          <EuiIcon type="iInCircle" />
          <EuiText size="xs">
            {i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChart.noSamplesAvailable',
              { defaultMessage: 'No samples available' }
            )}
          </EuiText>
        </div>
      )}
    </div>
  );
}
