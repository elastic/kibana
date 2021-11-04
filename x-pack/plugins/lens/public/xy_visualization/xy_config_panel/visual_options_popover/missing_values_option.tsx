/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip, EuiSuperSelect, EuiText } from '@elastic/eui';
import { fittingFunctionDefinitions } from '../../../../common/expressions';
import type { FittingFunction } from '../../../../common/expressions';

export interface MissingValuesOptionProps {
  fittingFunction?: FittingFunction;
  onFittingFnChange: (newMode: FittingFunction) => void;
  isFittingEnabled?: boolean;
}

export const MissingValuesOptions: React.FC<MissingValuesOptionProps> = ({
  onFittingFnChange,
  fittingFunction,
  isFittingEnabled = true,
}) => {
  return (
    <>
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
