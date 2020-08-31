/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { ChangeEvent, useCallback, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

import * as RuleI18n from '../../../pages/detection_engine/rules/translations';
import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';

interface AddItemProps {
  addText: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
  validate?: (args: unknown) => boolean;
}

const MyEuiFormRow = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiText {
      padding-right: 32px;
    }
  }
`;

export const MyAddItemButton = styled(EuiButtonEmpty)`
  margin-top: 4px;

  &.euiButtonEmpty--xSmall {
    font-size: 12px;
  }

  .euiIcon {
    width: 12px;
    height: 12px;
  }
`;

MyAddItemButton.defaultProps = {
  flush: 'left',
  iconType: 'plusInCircle',
  size: 'xs',
};

export const AddItem = ({
  addText,
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  validate,
}: AddItemProps) => {
  const [showValidation, setShowValidation] = useState(false);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [haveBeenKeyboardDeleted, setHaveBeenKeyboardDeleted] = useState(-1);

  const inputsRef = useRef<HTMLInputElement[]>([]);

  const removeItem = useCallback(
    (index: number) => {
      const values = field.value as string[];
      const newValues = [...values.slice(0, index), ...values.slice(index + 1)];
      field.setValue(newValues.length === 0 ? [''] : newValues);
      inputsRef.current = [
        ...inputsRef.current.slice(0, index),
        ...inputsRef.current.slice(index + 1),
      ];
      inputsRef.current = inputsRef.current.map((ref, i) => {
        if (i >= index && inputsRef.current[index] != null) {
          ref.value = 're-render';
        }
        return ref;
      });
    },
    [field]
  );

  const addItem = useCallback(() => {
    const values = field.value as string[];
    field.setValue([...values, '']);
  }, [field]);

  const updateItem = useCallback(
    (event: ChangeEvent<HTMLInputElement>, index: number) => {
      event.persist();
      const values = field.value as string[];
      const value = event.target.value;
      field.setValue([...values.slice(0, index), value, ...values.slice(index + 1)]);
    },
    [field]
  );

  const handleLastInputRef = useCallback(
    (index: number, element: HTMLInputElement | null) => {
      if (element != null) {
        inputsRef.current = [
          ...inputsRef.current.slice(0, index),
          element,
          ...inputsRef.current.slice(index + 1),
        ];
      }
    },
    [inputsRef]
  );

  useEffect(() => {
    if (
      haveBeenKeyboardDeleted !== -1 &&
      !isEmpty(inputsRef.current) &&
      inputsRef.current[haveBeenKeyboardDeleted] != null
    ) {
      inputsRef.current[haveBeenKeyboardDeleted].focus();
      setHaveBeenKeyboardDeleted(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveBeenKeyboardDeleted, inputsRef.current]);

  const values = field.value as string[];
  return (
    <MyEuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      error={showValidation ? errorMessage : null}
      isInvalid={showValidation && isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        {values.map((item, index) => {
          const euiFieldProps = {
            disabled: isDisabled,
            ...(index === values.length - 1
              ? { inputRef: handleLastInputRef.bind(null, index) }
              : {}),
            ...((inputsRef.current[index] != null && inputsRef.current[index].value !== item) ||
            inputsRef.current[index] == null
              ? { value: item }
              : {}),
            isInvalid: validate == null ? false : showValidation && validate(item),
          };
          return (
            <div key={index}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow>
                  <EuiFieldText
                    onBlur={() => setShowValidation(true)}
                    onChange={(e) => updateItem(e, index)}
                    fullWidth
                    {...euiFieldProps}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="danger"
                    iconType="trash"
                    isDisabled={isDisabled || (isEmpty(item) && values.length === 1)}
                    onClick={() => removeItem(index)}
                    aria-label={RuleI18n.DELETE}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              {values.length - 1 !== index && <EuiSpacer size="s" />}
            </div>
          );
        })}

        <MyAddItemButton onClick={addItem} isDisabled={isDisabled}>
          {addText}
        </MyAddItemButton>
      </>
    </MyEuiFormRow>
  );
};
