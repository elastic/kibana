/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const plotByFunctionOptions = [
  {
    value: 'mean',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByAvgOptionLabel', {
      defaultMessage: 'mean',
    }),
  },
  {
    value: 'min',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByMinOptionLabel', {
      defaultMessage: 'min',
    }),
  },
  {
    value: 'max',
    text: i18n.translate('xpack.ml.timeSeriesExplorer.plotByMaxOptionLabel', {
      defaultMessage: 'max',
    }),
  },
];
export const PlotByFunctionControls = ({
  functionDescription,
  setFunctionDescription,
}: {
  functionDescription: undefined | string;
  setFunctionDescription: (func: string) => void;
}) => {
  if (functionDescription === undefined) return null;
  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow
        label={i18n.translate('xpack.ml.timeSeriesExplorer.metricPlotByOption', {
          defaultMessage: 'Function',
        })}
      >
        <EuiSelect
          options={plotByFunctionOptions}
          value={functionDescription}
          onChange={(e) => setFunctionDescription(e.target.value)}
          aria-label={i18n.translate('xpack.ml.timeSeriesExplorer.metricPlotByOptionLabel', {
            defaultMessage: 'Pick function to plot by (min, max, or average) if metric function',
          })}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
