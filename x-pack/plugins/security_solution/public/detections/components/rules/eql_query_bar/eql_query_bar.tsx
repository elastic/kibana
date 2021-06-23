/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, ChangeEvent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';

import { FieldHook } from '../../../../shared_imports';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';
import { EqlQueryBarFooter } from './footer';
import { getValidationResults } from './validators';
import {
  EqlOptionsData,
  EqlOptionsSelected,
  FieldsEqlOptions,
} from '../../../../../common/search_strategy';

const TextArea = styled(EuiTextArea)`
  display: block;
  border: ${({ theme }) => theme.eui.euiBorderThin};
  border-bottom: 0;
  box-shadow: none;
  min-height: ${({ theme }) => theme.eui.euiFormControlHeight};
`;

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  idAria?: string;
  optionsData?: EqlOptionsData;
  optionsSelected?: EqlOptionsSelected;
  onOptionsChange?: (field: FieldsEqlOptions, newValue: string | null) => void;
  onValidityChange?: (arg: boolean) => void;
  onValiditingChange?: (arg: boolean) => void;
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({
  dataTestSubj,
  field,
  idAria,
  optionsData,
  optionsSelected,
  onOptionsChange,
  onValidityChange,
  onValiditingChange,
}) => {
  const { addError } = useAppToasts();
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const { isValidating, setValue } = field;
  const { isValid, message, messages, error } = getValidationResults(field);
  const fieldValue = field.value.query.query as string;

  // Bubbles up field validity to parent.
  // Using something like form `getErrors` does
  // not guarantee latest validity state
  useEffect(() => {
    if (onValidityChange != null) {
      onValidityChange(isValid);
    }
  }, [isValid, onValidityChange]);

  useEffect(() => {
    setErrorMessages(messages ?? []);
  }, [messages]);

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.EQL_VALIDATION_REQUEST_ERROR });
    }
  }, [error, addError]);

  useEffect(() => {
    if (onValiditingChange) {
      onValiditingChange(isValidating);
    }
  }, [isValidating, onValiditingChange]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;
      if (onValiditingChange) {
        onValiditingChange(true);
      }
      setErrorMessages([]);
      setValue({
        filters: [],
        query: {
          query: newQuery,
          language: 'eql',
        },
      });
    },
    [setValue, onValiditingChange]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={message}
      isInvalid={!isValid && !isValidating}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        <TextArea
          data-test-subj="eqlQueryBarTextInput"
          fullWidth
          isInvalid={!isValid && !isValidating}
          value={fieldValue}
          onChange={handleChange}
        />
        <EqlQueryBarFooter
          errors={errorMessages}
          isLoading={isValidating}
          optionsData={optionsData}
          optionsSelected={optionsSelected}
          onOptionsChange={onOptionsChange}
        />
      </>
    </EuiFormRow>
  );
};
