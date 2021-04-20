/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { CONTINUE_BUTTON_LABEL } from '../../../shared/constants';

import {
  ADD_VALUE_BUTTON_LABEL,
  DELETE_VALUE_BUTTON_LABEL,
  INPUT_ROW_PLACEHOLDER,
} from './constants';
import { InputRow } from './input_row';
import { MultiInputRowsLogic } from './multi_input_rows_logic';
import { filterEmptyValues } from './utils';

interface Props {
  id: string;
  initialValues?: string[];
  onSubmit?(values: string[]): void;
  onChange?(values: string[]): void;
  submitButtonText?: string;
  addRowText?: string;
  deleteRowLabel?: string;
  inputPlaceholder?: string;
}

export const MultiInputRows: React.FC<Props> = ({
  id,
  initialValues = [''],
  onSubmit,
  onChange,
  submitButtonText = CONTINUE_BUTTON_LABEL,
  addRowText = ADD_VALUE_BUTTON_LABEL,
  deleteRowLabel = DELETE_VALUE_BUTTON_LABEL,
  inputPlaceholder = INPUT_ROW_PLACEHOLDER,
}) => {
  const logic = MultiInputRowsLogic({ id, values: initialValues });
  const { values, hasEmptyValues, hasOnlyOneValue } = useValues(logic);
  const { addValue, editValue, deleteValue } = useActions(logic);

  useEffect(() => {
    if (onChange) {
      onChange(filterEmptyValues(values));
    }
  }, [values]);

  return (
    <>
      {values.map((value: string, index: number) => (
        <InputRow
          key={`inputRow${index}`}
          value={value}
          placeholder={inputPlaceholder}
          onChange={(newValue) => editValue(index, newValue)}
          onDelete={() => deleteValue(index)}
          disableDelete={hasOnlyOneValue}
          deleteLabel={deleteRowLabel}
        />
      ))}
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={addValue}
        isDisabled={hasEmptyValues}
        data-test-subj="addInputRowButton"
      >
        {addRowText}
      </EuiButtonEmpty>
      {onSubmit && (
        <>
          <EuiSpacer />
          <EuiButton
            fill
            isDisabled={hasOnlyOneValue && hasEmptyValues}
            onClick={() => onSubmit(filterEmptyValues(values))}
            data-test-subj="submitInputValuesButton"
          >
            {submitButtonText}
          </EuiButton>
        </>
      )}
    </>
  );
};
