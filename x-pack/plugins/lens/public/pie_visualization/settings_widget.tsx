/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiSuperSelect, EuiFieldNumber, EuiSwitch } from '@elastic/eui';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PieVisualizationState, SharedLayerState } from './types';
import { VisualizationLayerWidgetProps } from '../types';

const numberOptions: Array<{ value: SharedLayerState['numberDisplay']; inputDisplay: string }> = [
  {
    value: 'hidden',
    inputDisplay: i18n.translate('xpack.lens.pieChart.hiddenNumbersLabel', {
      defaultMessage: 'Hide from chart',
    }),
  },
  {
    value: 'percent',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showPercentValuesLabel', {
      defaultMessage: 'Show percent',
    }),
  },
  {
    value: 'value',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showFormatterValuesLabel', {
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
      defaultMessage: 'Inside or outside',
    }),
  },
  {
    value: 'inside',
    inputDisplay: i18n.translate('xpack.lens.pieChart.fitInsideOnlyLabel', {
      defaultMessage: 'Inside only',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
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
    value: 'show',
    inputDisplay: i18n.translate('xpack.lens.pieChart.alwaysShowLegendLabel', {
      defaultMessage: 'Show legend',
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
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.labelPositionLabel', {
          defaultMessage: 'Label position',
        })}
        fullWidth
        display="columnCompressed"
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
        label={i18n.translate('xpack.lens.pieChart.numberLabels', {
          defaultMessage: 'Label values',
        })}
        fullWidth
        display="columnCompressed"
      >
        <EuiSuperSelect
          valueOfSelected={layer.numberDisplay}
          options={numberOptions}
          onChange={option => {
            setState({
              ...state,
              layers: [{ ...layer, numberDisplay: option }],
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.percentDecimalsLabel', {
          defaultMessage: 'Decimal places for percent',
        })}
        fullWidth
        display="columnCompressed"
      >
        <EuiFieldNumber
          data-test-subj="indexPattern-dimension-formatDecimals"
          value={layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS}
          min={0}
          max={10}
          onChange={e => {
            setState({
              ...state,
              layers: [{ ...layer, percentDecimals: Number(e.target.value) }],
            });
          }}
          compressed
          fullWidth
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.lens.pieChart.legendDisplayLabel', {
          defaultMessage: 'Legend display',
        })}
        display="columnCompressed"
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
      <EuiFormRow
        display="columnCompressedSwitch"
        label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
          defaultMessage: 'Nested legend',
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.lens.pieChart.nestedLegendLabel', {
            defaultMessage: 'Nested legend',
          })}
          showLabel={false}
          checked={!!layer.nestedLegend}
          onChange={() => {
            setState({ ...state, layers: [{ ...layer, nestedLegend: !layer.nestedLegend }] });
          }}
        />
      </EuiFormRow>
    </EuiForm>
  );
}
