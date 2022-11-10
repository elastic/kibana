/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { isEmpty, map } from 'lodash';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import type { ValidationError } from '@kbn/osquery-plugin/public/shared_imports';
import { getCustomErrorMessage, validateForEmptyParams } from './validations';
import { FORM_ERRORS_TITLE } from '../../detections/components/rules/rule_actions_field/translations';
import { ResponseActionsHeader } from './response_actions_header';
import { ResponseActionsList } from './response_actions_list';

import type { ArrayItem } from '../../shared_imports';
import { useFormContext } from '../../shared_imports';
import { useFormData } from '../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';

const FieldErrorsContainer = styled.div`
  p {
    margin-bottom: 0;
  }
`;

export interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<{ errors: ValidationError<string>; path: string }>;
  };
}

interface IProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  saveClickRef: React.RefObject<{
    onSaveClick?: () => void;
  }>;
}

export const ResponseActionsForm = ({ items, addItem, removeItem, saveClickRef }: IProps) => {
  const responseActionsValidationRef = useRef<ResponseActionValidatorRef>({ validation: {} });
  const supportedResponseActionTypes = useSupportedResponseActionTypes();
  const [uiFieldErrors, setUIFieldErrors] = useState<string | null>(null);
  const [formData] = useFormData();
  const { getFields, validate } = useFormContext();
  const fields = getFields();

  // connect the custom response action validation with the wrapping form
  const validateResponseActions = useCallback(async () => {
    await validate();
    if (formData?.responseActions?.length) {
      // if the specific response action has a validation function, call it
      if (!isEmpty(responseActionsValidationRef.current?.validation)) {
        await Promise.all(
          map(responseActionsValidationRef.current?.validation, async (validation) => {
            const response = await validation();
            const paramsErrors: Array<ValidationError<string>> = [];

            map(response.errors, (error) => {
              if (!isEmpty(error)) {
                const message = !isEmpty(error.message)
                  ? error.message
                  : getCustomErrorMessage(error.ref.name);
                const errorObject = {
                  code: 'ERR_FIELD_MISSING',
                  path: `${response.path}.params`,
                  message: `**ResponseActions:** \n ${message}\n `,
                };

                fields[`${response.path}.params`]?.setErrors([errorObject]);
                paramsErrors.push(errorObject);
                const errorsString = paramsErrors
                  ?.map((paramsError) => paramsError?.message)
                  .join('\n');
                setUIFieldErrors(errorsString);
              } else {
                setUIFieldErrors(null);
              }
            });
          })
        );
      } else {
        // Response Action Item created in UseArray, but not yet initialized (has no params)
        const errorStrings = validateForEmptyParams(formData.responseActions, fields);

        setUIFieldErrors(errorStrings);
      }
    } else {
      setUIFieldErrors(null);
    }
  }, [fields, formData.responseActions, validate]);

  useEffect(() => {
    if (saveClickRef && saveClickRef.current) {
      saveClickRef.current.onSaveClick = () => {
        return validateResponseActions();
      };
    }
  }, [saveClickRef, validateResponseActions]);

  const form = useMemo(() => {
    if (!supportedResponseActionTypes?.length) {
      return null;
    }
    return (
      <ResponseActionsList
        items={items}
        removeItem={removeItem}
        supportedResponseActionTypes={supportedResponseActionTypes}
        addItem={addItem}
        formRef={responseActionsValidationRef}
      />
    );
  }, [addItem, responseActionsValidationRef, items, removeItem, supportedResponseActionTypes]);

  return (
    <>
      <EuiSpacer size="xxl" data-test-subj={'response-actions-form'} />
      <ResponseActionsHeader />
      {uiFieldErrors ? (
        <>
          <FieldErrorsContainer>
            <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="alert">
              <ReactMarkdown>{uiFieldErrors}</ReactMarkdown>
            </EuiCallOut>
          </FieldErrorsContainer>
          <EuiSpacer />
        </>
      ) : null}
      {form}
    </>
  );
};
