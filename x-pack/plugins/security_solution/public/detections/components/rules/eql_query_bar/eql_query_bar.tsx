/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, ChangeEvent, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiTextArea } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useEqlValidation } from '../../../../common/hooks/eql/use_eql_validation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { ErrorsPopover } from './errors_popover';

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  idAria?: string;
  index: string[];
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({ dataTestSubj, field, idAria, index }) => {
  const { http } = useKibana().services;
  const { addError } = useAppToasts();
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const { error, start, result } = useEqlValidation();
  const { setErrors, setValue } = field;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const fieldValue = field.value.query.query as string;

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.EQL_VALIDATION_REQUEST_ERROR });
    }
  }, [error, addError]);

  useEffect(() => {
    if (result != null && result.valid === false && result.errors.length > 0) {
      setErrors([{ message: '' }]);
      setErrorMessages(result.errors);
    }
  }, [result, setErrors]);

  const handleValidation = useCallback(() => {
    if (fieldValue) {
      start({ http, index, query: fieldValue });
    }
  }, [fieldValue, http, index, start]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;

      setErrorMessages([]);
      setValue({
        filters: [],
        query: {
          query: newQuery,
          language: 'eql',
        },
      });
    },
    [setValue]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        <EuiTextArea
          data-test-subj="eqlQueryBarTextInput"
          fullWidth
          isInvalid={isInvalid}
          value={fieldValue}
          onBlur={handleValidation}
          onChange={handleChange}
        />
        {errorMessages.length > 0 && (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <ErrorsPopover
                ariaLabel={i18n.EQL_VALIDATION_ERROR_POPOVER_LABEL}
                errors={errorMessages}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </>
    </EuiFormRow>
  );
};
