/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { isEsqlRule } from '../../../../../common/detection_engine/utils';

import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';

import { fetchEsqlOptions } from '../esql_fields_select/validators';

const AS_PLAIN_TEXT = { asPlainText: true };
const COMPONENT_WIDTH = 500;

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  fieldType: string;
  placeholder?: string;
  getFormData: () => DefineStepRule;
}

export const EsqlAutocomplete: React.FC<AutocompleteFieldProps> = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  fieldType,
  placeholder,
  getFormData,
}): JSX.Element => {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const handleValuesChange = useCallback(
    ([newOption]: EuiComboBoxOptionOption[]): void => {
      field.setValue(newOption?.label ?? '');
    },
    [field]
  );

  const onFocusHandler = useCallback(async () => {
    const formData = getFormData();
    const query = formData.queryBar.query.query;
    const ruleType = formData.ruleType;

    if (typeof query !== 'string') {
      return;
    }

    if (!query && !isEsqlRule(ruleType)) {
      return;
    }

    // most likely result already be taken from react-query cache, since query will be validated once user finishes editing query input
    const newOptions = await fetchEsqlOptions(query);
    setOptions(newOptions);
  }, [getFormData]);

  const selectedOptions = field.value ? [{ label: field.value as string }] : [];

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      fullWidth
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <EuiComboBox
        placeholder={placeholder ?? ''}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleValuesChange}
        isLoading={false}
        isDisabled={isDisabled}
        isClearable={false}
        singleSelection={AS_PLAIN_TEXT}
        data-test-subj="esqlAutocompleteComboBox"
        style={{ width: `${COMPONENT_WIDTH}px` }}
        onFocus={onFocusHandler}
        fullWidth
      />
    </EuiFormRow>
  );
};

EsqlAutocomplete.displayName = 'EsqlAutocomplete';
