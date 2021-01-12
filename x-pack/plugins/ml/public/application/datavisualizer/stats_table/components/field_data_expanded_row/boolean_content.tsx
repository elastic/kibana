/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n/react';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { getTFPercentage } from '../../utils';
import { roundToDecimalPlace } from '../../../../formatters/round_to_decimal_place';
import { useUiSettings } from '../../../../contexts/kibana';

function getPercentLabel(value: number): string {
  if (value === 0) {
    return '0%';
  }
  if (value >= 0.1) {
    return `${roundToDecimalPlace(value)}%`;
  } else {
    return '< 0.1%';
  }
}

const BOOLEAN_DISTRIBUTION_CHART_HEIGHT = 100;

export const BooleanContent: FC<FieldDataRowProps> = ({ config }) => {
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const formattedPercentages = useMemo(() => getTFPercentage(config), [config]);
  const IS_DARK_THEME = useUiSettings().get('theme:darkMode');
  const themeName = IS_DARK_THEME ? darkTheme : lightTheme;
  const AREA_SERIES_COLOR = themeName.euiColorVis0;
  if (!formattedPercentages) return null;

  return (
    <div className="mlFieldDataCard__stats">
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardBoolean.valuesLabel"
          defaultMessage="Values"
        />
      </ExpandedRowFieldHeader>
      <EuiSpacer size="xs" />
      <Chart renderer="canvas" size={{ height: BOOLEAN_DISTRIBUTION_CHART_HEIGHT }}>
        <Axis id="bottom" position="bottom" showOverlappingTicks />
        <Axis
          id="left2"
          title="Left axis"
          hide={true}
          tickFormat={(d: any) => {
            const percentage = (d / formattedPercentages.count) * 100;
            return `${d} (${getPercentLabel(percentage)})`;
          }}
        />

        <Settings
          showLegend={false}
          theme={{
            axes: {
              tickLabel: {
                fontSize: parseInt(themeName.euiFontSizeXS, 10),
                fontFamily: themeName.euiFontFamily,
                fontStyle: 'italic',
              },
            },
            background: { color: 'transparent' },
            chartMargins: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            },
            chartPaddings: {
              left: 0,
              right: 0,
              top: 4,
              bottom: 0,
            },
            scales: { barsPadding: 0.1 },
            colors: {
              vizColors: [AREA_SERIES_COLOR],
            },
            areaSeriesStyle: {
              line: {
                strokeWidth: 1,
                visible: true,
              },
              point: {
                visible: false,
                radius: 0,
                opacity: 0,
              },
              area: { visible: true, opacity: 1 },
            },
          }}
        />
        <BarSeries
          id={config.fieldName || fieldFormat}
          data={[
            {
              x: 'true',
              count: formattedPercentages.trueCount,
            },
            {
              x: 'false',
              count: formattedPercentages.falseCount,
            },
          ]}
          splitSeriesAccessors={['x']}
          stackAccessors={['x']}
          xAccessor="x"
          xScaleType="ordinal"
          yAccessors={['count']}
          yScaleType="linear"
        />
      </Chart>
    </div>
  );
};
