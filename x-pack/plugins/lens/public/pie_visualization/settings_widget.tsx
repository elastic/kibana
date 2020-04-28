/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { PieVisualizationState, SharedLayerState } from './types';
import { VisualizationLayerWidgetProps } from '../types';

const formatOptions: Array<{ value: SharedLayerState['numberDisplay']; inputDisplay: string }> = [
  {
    value: 'hidden',
    inputDisplay: i18n.translate('xpack.lens.pieChart.hiddenNumbersLabel', {
      defaultMessage: 'Hidden numbers',
    }),
  },
  {
    value: 'percent',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showPercentValuesLabel', {
      defaultMessage: 'Percent',
    }),
  },
  {
    value: 'value',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showForamtterValuesLabel', {
      defaultMessage: 'Show value',
    }),
  },
];

const categoryOptions: Array<{
  value: SharedLayerState['categoryDisplay'];
  inputDisplay: string;
}> = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showCategoriesLabel', {
      defaultMessage: 'Show categories',
    }),
  },
  {
    value: 'inside',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoryLinksOnlyLabel', {
      defaultMessage: 'Only show labels inside chart',
    }),
  },
  {
    value: 'link',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoryLinksOnlyLabel', {
      defaultMessage: 'Only show categories outside chart',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide categories',
    }),
  },
];

const legendOptions: Array<{
  value: SharedLayerState['legendDisplay'];
  inputDisplay: string;
}> = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.defaultLegendLabel', {
      defaultMessage: 'Default legend',
    }),
  },
  {
    value: 'nested',
    inputDisplay: i18n.translate('xpack.lens.pieChart.alwaysShowNestedLegendLabel', {
      defaultMessage: 'Show nested legend',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.hideLegendLabel', {
      defaultMessage: 'Hide legend',
    }),
  },
];

export function SettingsWidget(props: VisualizationLayerWidgetProps<PieVisualizationState>) {
  const { state, setState } = props;
  const layer = state.layers[0];
  if (!layer) {
    return null;
  }

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.numberDisplayLabel', {
          defaultMessage: 'Number format',
        })}
      >
        <EuiSuperSelect
          valueOfSelected={layer.numberDisplay}
          options={formatOptions}
          onChange={option => {
            setState({
              ...state,
              layers: [{ ...layer, numberDisplay: option }],
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.categoryDisplayLabel', {
          defaultMessage: 'Category display',
        })}
      >
        <EuiSuperSelect
          valueOfSelected={layer.categoryDisplay}
          options={categoryOptions}
          onChange={option => {
            setState({
              ...state,
              layers: [{ ...layer, categoryDisplay: option }],
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.legendDisplayLabel', {
          defaultMessage: 'Legend display',
        })}
      >
        <EuiSuperSelect
          valueOfSelected={layer.legendDisplay}
          options={legendOptions}
          onChange={option => {
            setState({
              ...state,
              layers: [{ ...layer, legendDisplay: option }],
            });
          }}
        />
      </EuiFormRow>
    </>
  );
}
