/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, ReactNode } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DependentVariable } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { useFieldStatsTrigger } from '../../../../../components/field_stats_flyout';

interface ConfigurationStepDependentVariableRowProps {
  label: string;
  isInvalid: boolean;
  placeholder: string;
  isDisabled: boolean;
  isLoading: boolean;
  loadingDepVarOptions: boolean;
  dependentVariableOptions: EuiComboBoxOptionOption[];
  dependentVariable: DependentVariable;
  onChange: (options: EuiComboBoxOptionOption[]) => void;
  helpText?: string;
  error?: ReactNode | ReactNode[];
}
export const ConfigurationStepDependentVariableRow: FC<
  ConfigurationStepDependentVariableRowProps
> = ({
  helpText,
  label,
  isInvalid,
  error,
  placeholder,
  isDisabled,
  isLoading,
  loadingDepVarOptions,
  dependentVariableOptions,
  dependentVariable,
  onChange,
}) => {
  const { renderOption } = useFieldStatsTrigger();

  return (
    <Fragment>
      <EuiFormRow fullWidth label={label} helpText={helpText} isInvalid={isInvalid} error={error}>
        <EuiComboBox
          fullWidth
          aria-label={i18n.translate(
            'xpack.ml.dataframe.analytics.create.dependentVariableInputAriaLabel',
            {
              defaultMessage: 'Enter field to be used as dependent variable.',
            }
          )}
          placeholder={placeholder}
          isDisabled={isDisabled}
          isLoading={isLoading}
          singleSelection={true}
          options={dependentVariableOptions}
          selectedOptions={dependentVariable ? [{ label: dependentVariable }] : []}
          onChange={onChange}
          isClearable={false}
          isInvalid={dependentVariable === ''}
          data-test-subj={`mlAnalyticsCreateJobWizardDependentVariableSelect${
            loadingDepVarOptions ? ' loading' : ' loaded'
          }`}
          renderOption={renderOption}
        />
      </EuiFormRow>
    </Fragment>
  );
};
