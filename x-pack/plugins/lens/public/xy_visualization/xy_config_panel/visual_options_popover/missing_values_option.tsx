/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, EuiIconTip, EuiSuperSelect, EuiText } from '@elastic/eui';
import { fittingFunctionDefinitions } from '../../../../common/expressions';
import type { FittingFunction, ValueLabelConfig } from '../../../../common/expressions';

export interface MissingValuesOptionProps {
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  onValueLabelChange: (newMode: ValueLabelConfig) => void;
  onFittingFnChange: (newMode: FittingFunction) => void;
  isValueLabelsEnabled?: boolean;
  isFittingEnabled?: boolean;
}

const valueLabelsOptions: Array<{
  id: string;
  value: 'hide' | 'inside' | 'outside';
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `value_labels_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.xyChart.valueLabelsVisibility.auto', {
      defaultMessage: 'Hide',
    }),
    'data-test-subj': 'lnsXY_valueLabels_hide',
  },
  {
    id: `value_labels_inside`,
    value: 'inside',
    label: i18n.translate('xpack.lens.xyChart.valueLabelsVisibility.inside', {
      defaultMessage: 'Show',
    }),
    'data-test-subj': 'lnsXY_valueLabels_inside',
  },
];

export const MissingValuesOptions: React.FC<MissingValuesOptionProps> = ({
  onValueLabelChange,
  onFittingFnChange,
  valueLabels,
  fittingFunction,
  isValueLabelsEnabled = true,
  isFittingEnabled = true,
}) => {
  const valueLabelsVisibilityMode = valueLabels || 'hide';

  return (
    <>
      {isValueLabelsEnabled && (
        <EuiFormRow
          display="columnCompressed"
          label={
            <span>
              {i18n.translate('xpack.lens.shared.chartValueLabelVisibilityLabel', {
                defaultMessage: 'Labels',
              })}
            </span>
          }
        >
          <EuiButtonGroup
            isFullWidth
            legend={i18n.translate('xpack.lens.shared.chartValueLabelVisibilityLabel', {
              defaultMessage: 'Labels',
            })}
            data-test-subj="lnsValueLabelsDisplay"
            name="valueLabelsDisplay"
            buttonSize="compressed"
            options={valueLabelsOptions}
            idSelected={
              valueLabelsOptions.find(({ value }) => value === valueLabelsVisibilityMode)!.id
            }
            onChange={(modeId) => {
              const newMode = valueLabelsOptions.find(({ id }) => id === modeId)!.value;
              onValueLabelChange(newMode);
            }}
          />
        </EuiFormRow>
      )}
      {isFittingEnabled && (
        <EuiFormRow
          display="columnCompressed"
          label={
            <>
              {i18n.translate('xpack.lens.xyChart.missingValuesLabel', {
                defaultMessage: 'Missing values',
              })}{' '}
              <EuiIconTip
                color="subdued"
                content={i18n.translate('xpack.lens.xyChart.missingValuesLabelHelpText', {
                  defaultMessage: `By default, Lens hides the gaps in the data. To fill the gap, make a selection.`,
                })}
                iconProps={{
                  className: 'eui-alignTop',
                }}
                position="top"
                size="s"
                type="questionInCircle"
              />
            </>
          }
        >
          <EuiSuperSelect
            data-test-subj="lnsMissingValuesSelect"
            compressed
            options={fittingFunctionDefinitions.map(({ id, title, description }) => {
              return {
                value: id,
                dropdownDisplay: (
                  <>
                    <strong>{title}</strong>
                    <EuiText size="xs" color="subdued">
                      <p>{description}</p>
                    </EuiText>
                  </>
                ),
                inputDisplay: title,
              };
            })}
            valueOfSelected={fittingFunction || 'None'}
            onChange={(value) => onFittingFnChange(value)}
            itemLayoutAlign="top"
            hasDividers
          />
        </EuiFormRow>
      )}
    </>
  );
};
