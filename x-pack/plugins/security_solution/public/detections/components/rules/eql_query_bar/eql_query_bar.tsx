/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, ChangeEvent } from 'react';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  idAria?: string;
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({ dataTestSubj, field, idAria }) => {
  const { setValue } = field;
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const fieldValue = field.value.query.query as string;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;

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
      <EuiTextArea
        data-test-subj="eqlQueryBarTextInput"
        fullWidth
        isInvalid={isInvalid}
        value={fieldValue}
        onChange={handleChange}
      />
    </EuiFormRow>
  );
};
