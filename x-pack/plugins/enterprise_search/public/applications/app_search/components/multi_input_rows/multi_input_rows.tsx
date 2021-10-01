/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';

import { EuiForm, EuiButton, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

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
  onChange?(values: string[]): void;
  onSubmit?(values: string[]): void;
  showSubmitButton?: boolean;
  submitButtonText?: string;
  addRowText?: string;
  deleteRowLabel?: string;
  inputPlaceholder?: string;
}

export const MultiInputRows: React.FC<Props> = ({
  id,
  initialValues = [''],
  onChange,
  onSubmit,
  showSubmitButton = true,
  submitButtonText = CONTINUE_BUTTON_LABEL,
  addRowText = ADD_VALUE_BUTTON_LABEL,
  deleteRowLabel = DELETE_VALUE_BUTTON_LABEL,
  inputPlaceholder = INPUT_ROW_PLACEHOLDER,
}) => {
  const logic = MultiInputRowsLogic({ id, values: initialValues });
  const { values, addedNewRow, hasEmptyValues, hasOnlyOneValue } = useValues(logic);
  const { addValue, editValue, deleteValue } = useActions(logic);

  useUpdateEffect(() => {
    if (onChange) {
      onChange(filterEmptyValues(values));
    }
  }, [values]);

  return (
    <EuiForm
      id={id}
      component={onSubmit ? 'form' : 'div'}
      onSubmit={
        onSubmit
          ? (e: React.SyntheticEvent) => {
              e.preventDefault();
              onSubmit(filterEmptyValues(values));
            }
          : undefined
      }
    >
      {values.map((value: string, index: number) => {
        const firstRow = index === 0;
        const lastRow = index === values.length - 1;
        return (
          <InputRow
            key={`inputRow-${id}-${index}`}
            value={value}
            placeholder={inputPlaceholder}
            autoFocus={addedNewRow ? lastRow : firstRow}
            onChange={(newValue) => editValue(index, newValue)}
            onDelete={() => deleteValue(index)}
            disableDelete={hasOnlyOneValue}
            deleteLabel={deleteRowLabel}
          />
        );
      })}
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={addValue}
        isDisabled={hasEmptyValues}
        data-test-subj="addInputRowButton"
      >
        {addRowText}
      </EuiButtonEmpty>
      {showSubmitButton && onSubmit && (
        <>
          <EuiSpacer />
          <EuiButton
            fill
            isDisabled={hasOnlyOneValue && hasEmptyValues}
            data-test-subj="submitInputValuesButton"
            type="submit"
          >
            {submitButtonText}
          </EuiButton>
        </>
      )}
    </EuiForm>
  );
};
