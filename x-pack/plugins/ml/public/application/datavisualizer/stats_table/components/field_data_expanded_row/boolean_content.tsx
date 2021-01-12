/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { FormattedMessage } from '@kbn/i18n/react';

import type { FieldDataRowProps } from '../../types/field_data_row';
import { ExpandedRowFieldHeader } from '../expanded_row_field_header';
import { getTFPercentage } from '../../utils';

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

export const BooleanContent: FC<FieldDataRowProps> = ({ config }) => {
  const fieldFormat = 'fieldFormat' in config ? config.fieldFormat : undefined;
  const formattedPercentages = getTFPercentage(config);
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
          id={config.fieldName || fieldFormat}
          data={[
            { x: 'true', y: formattedPercentages.truePercentage },
            { x: 'false', y: formattedPercentages.falsePercentage },
          ]}
          displayValueSettings={{
            hideClippedValue: true,
            isAlternatingValueLabel: true,
            valueFormatter: getPercentLabel,
            isValueContainedInElement: false,
            showValueLabel: true,
          }}
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
