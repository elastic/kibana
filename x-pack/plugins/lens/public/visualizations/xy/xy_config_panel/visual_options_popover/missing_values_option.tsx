/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip, EuiSuperSelect, EuiSwitch, EuiText } from '@elastic/eui';
import type { FittingFunction, EndValue } from '@kbn/expression-xy-plugin/common';
import { fittingFunctionDefinitions } from './fitting_function_definitions';
import { endValueDefinitions } from './end_value_definitions';

export interface MissingValuesOptionProps {
  fittingFunction?: FittingFunction;
  onFittingFnChange: (newMode: FittingFunction) => void;
  emphasizeFitting?: boolean;
  onEmphasizeFittingChange: (emphasize: boolean) => void;
  endValue?: EndValue;
  onEndValueChange: (endValue: EndValue) => void;
  isFittingEnabled?: boolean;
}

export const MissingValuesOptions: React.FC<MissingValuesOptionProps> = ({
  onFittingFnChange,
  fittingFunction,
  emphasizeFitting,
  onEmphasizeFittingChange,
  onEndValueChange,
  endValue,
  isFittingEnabled = true,
}) => {
  return (
    <>
      {isFittingEnabled && (
        <>
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
                    defaultMessage: `By default, area and line charts hide the gaps in the data. To fill the gap, make a selection.`,
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
          {fittingFunction && fittingFunction !== 'None' && (
            <>
              <EuiFormRow
                display="columnCompressed"
                label={i18n.translate('xpack.lens.xyChart.endValuesLabel', {
                  defaultMessage: 'End values',
                })}
              >
                <EuiSuperSelect
                  data-test-subj="lnsEndValuesSelect"
                  compressed
                  options={endValueDefinitions.map(({ id, title, description }) => {
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
                  valueOfSelected={endValue || 'None'}
                  onChange={(value) => onEndValueChange(value)}
                  itemLayoutAlign="top"
                  hasDividers
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.lens.xyChart.missingValuesStyle', {
                  defaultMessage: 'Show as dotted line',
                })}
                display="columnCompressedSwitch"
              >
                <EuiSwitch
                  showLabel={false}
                  label={i18n.translate('xpack.lens.xyChart.missingValuesStyle', {
                    defaultMessage: 'Show as dotted line',
                  })}
                  checked={!emphasizeFitting}
                  onChange={() => {
                    onEmphasizeFittingChange(!emphasizeFitting);
                  }}
                  compressed
                />
              </EuiFormRow>
            </>
          )}
        </>
      )}
    </>
  );
};
