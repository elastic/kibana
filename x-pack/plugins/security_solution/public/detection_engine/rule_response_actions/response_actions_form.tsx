/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { map, reduce, upperFirst } from 'lodash';
import ReactMarkdown from 'react-markdown';
import { css } from '@emotion/react';
import { ResponseActionsWrapper } from './response_actions_wrapper';
import { FORM_ERRORS_TITLE } from '../../detections/components/rules/rule_actions_field/translations';
import { ResponseActionsHeader } from './response_actions_header';
import type { ArrayItem, FormHook } from '../../shared_imports';
import { useSupportedResponseActionTypes } from './use_supported_response_action_types';

const FieldErrorsContainer = css`
  margin-bottom: 0;
`;

interface ResponseActionsFormProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  form: FormHook;
}

export const ResponseActionsForm = ({
  items,
  addItem,
  removeItem,
  form,
}: ResponseActionsFormProps) => {
  const supportedResponseActionTypes = useSupportedResponseActionTypes();
  const [uiFieldErrors, setUIFieldErrors] = useState<string | null>(null);
  const fields = form.getFields();
  const errors = form.getErrors();

  const formContent = useMemo(() => {
    if (!supportedResponseActionTypes?.length) {
      return null;
    }

    return (
      <ResponseActionsWrapper
        items={items}
        removeItem={removeItem}
        supportedResponseActionTypes={supportedResponseActionTypes}
        addItem={addItem}
      />
    );
  }, [addItem, items, removeItem, supportedResponseActionTypes]);

  useEffect(() => {
    setUIFieldErrors(() => {
      const fieldErrors = reduce<string[], Array<{ type: string; errors: string[] }>>(
        map(items, 'path'),
        (acc, path) => {
          if (fields[`${path}.params`]?.errors?.length) {
            acc.push({
              type: upperFirst((fields[`${path}.actionTypeId`].value as string).substring(1)),
              errors: map(fields[`${path}.params`].errors, 'message'),
            });
            return acc;
          }

          return acc;
        },
        []
      );

      return reduce(
        fieldErrors,
        (acc, error) => {
          acc.push(`**${error.type}:**\n`);
          error.errors.forEach((err) => {
            acc.push(`- ${err}\n`);
          });

          return acc;
        },
        [] as string[]
      ).join('\n');
    });
  }, [fields, errors, items]);

  return (
    <>
      <EuiSpacer size="xxl" data-test-subj={'response-actions-form'} />
      <ResponseActionsHeader />
      {uiFieldErrors?.length && form.isSubmitted ? (
        <>
          <p css={FieldErrorsContainer}>
            <EuiCallOut
              data-test-subj="response-actions-error"
              title={FORM_ERRORS_TITLE}
              color="danger"
              iconType="alert"
            >
              <ReactMarkdown>{uiFieldErrors}</ReactMarkdown>
            </EuiCallOut>
          </p>
          <EuiSpacer />
        </>
      ) : null}
      {formContent}
    </>
  );
};
