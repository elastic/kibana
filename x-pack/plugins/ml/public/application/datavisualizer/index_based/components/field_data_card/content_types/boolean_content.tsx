/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n/react';

import { FieldDataCardProps } from '../field_data_card';
import { roundToDecimalPlace } from '../../../../../formatters/round_to_decimal_place';
import { ExpandedRowFieldHeader } from '../../../../stats_datagrid/components/expanded_row_field_header';

function getPercentLabel(value: number): string {
  if (value === 0) {
    return '0%';
  }
  if (value >= 0.1) {
    return `${value}%`;
  } else {
    return '< 0.1%';
  }
}

export const BooleanContent: FC<FieldDataCardProps> = ({ config }) => {
  const { stats } = config;
  if (stats === undefined) return null;
  const { count, trueCount, falseCount } = stats;
  if (count === undefined || trueCount === undefined || falseCount === undefined) return null;

  return (
    <div className="mlFieldDataCard__stats">
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardBoolean.valuesLabel"
          defaultMessage="Values"
        />
      </ExpandedRowFieldHeader>
      <EuiSpacer size="xs" />
      <Chart renderer="canvas" className="story-chart" size={{ height: 200 }}>
        <Axis id="bottom" position="bottom" showOverlappingTicks />
        <Settings
          showLegend={false}
          theme={{
            barSeriesStyle: {
              displayValue: {
                fill: '#000',
                fontSize: 12,
                fontStyle: 'normal',
                offsetX: 0,
                offsetY: -5,
                padding: 0,
              },
            },
          }}
        />
        <BarSeries
          id={config.fieldName || config.fieldFormat}
          data={[
            { x: 'true', y: roundToDecimalPlace((trueCount / count) * 100) },
            { x: 'false', y: roundToDecimalPlace((falseCount / count) * 100) },
          ]}
          displayValueSettings={{
            hideClippedValue: true,
            isAlternatingValueLabel: true,
            valueFormatter: getPercentLabel,
            isValueContainedInElement: false,
            showValueLabel: true,
          }}
          color={['rgba(230, 194, 32, 0.5)', 'rgba(224, 187, 20, 0.71)']}
          splitSeriesAccessors={['x']}
          stackAccessors={['x']}
          xAccessor="x"
          xScaleType="ordinal"
          yAccessors={['y']}
          yScaleType="linear"
        />
      </Chart>
    </div>
  );
};
