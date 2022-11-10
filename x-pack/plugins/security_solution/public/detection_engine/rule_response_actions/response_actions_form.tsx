/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { isEmpty, map, some } from 'lodash';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import type { ValidationError } from '@kbn/osquery-plugin/public/shared_imports';
import { FORM_ERRORS_TITLE } from '../../detections/components/rules/rule_actions_field/translations';
import { ResponseActionsHeader } from './response_actions_header';
import { ResponseActionsList } from './response_actions_list';

import type { ArrayItem } from '../../shared_imports';
import { useFormContext } from '../../shared_imports';
import { useFormData } from '../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';
import { RESPONSE_ACTION_TYPES } from '../../../common/detection_engine/rule_response_actions/schemas';

const FieldErrorsContainer = styled.div`
  p {
    margin-bottom: 0;
  }
`;

export interface ResponseActionValidatorRef {
  validation: {
    [key: string]: () => Promise<boolean>;
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
  const [fieldErrors, setFieldErrors] = useState<string | null>(null);
  const [formData] = useFormData();
  const { getFields, validate } = useFormContext();
  const fields = getFields();

  const validateResponseActions = useCallback(async () => {
    const paramsErrors: Array<ValidationError<string>> = [];
    await validate();
    if (formData?.responseActions?.length) {
      map(formData.responseActions, async (action, index) => {
        if (action.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && isEmpty(action.params)) {
          paramsErrors.push(fields[`responseActions[${index}].params`].errors[0]);
        }
      });
      const errorsString = paramsErrors.map(({ message }) => message).join('\n');
      setFieldErrors(errorsString);
    } else {
      setFieldErrors(null);
    }

    if (!isEmpty(responseActionsValidationRef.current?.validation)) {
      const response = await Promise.all(
        map(responseActionsValidationRef.current?.validation, async (validation) => {
          return validation();
        })
      );

      return some(response, (val) => !val);
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
      {fieldErrors ? (
        <>
          <FieldErrorsContainer>
            <EuiCallOut title={FORM_ERRORS_TITLE} color="danger" iconType="alert">
              <ReactMarkdown>{fieldErrors}</ReactMarkdown>
            </EuiCallOut>
          </FieldErrorsContainer>
          <EuiSpacer />
        </>
      ) : null}
      {form}
    </>
  );
};
