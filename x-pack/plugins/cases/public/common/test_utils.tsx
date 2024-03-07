/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import type { MatcherFunction } from '@testing-library/react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton } from '@elastic/eui';

/**
 * Convenience utility to remove text appended to links by EUI
 */
export const removeExternalLinkText = (str: string | null) =>
  str?.replace(/\(opens in a new tab or window\)/g, '');

export async function waitForComponentToPaint<P = {}>(wrapper: ReactWrapper<P>, amount = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, amount));
    wrapper.update();
  });
}

export const waitForComponentToUpdate = async () =>
  act(async () => {
    return Promise.resolve();
  });

type Query = (f: MatcherFunction) => HTMLElement;

export const createQueryWithMarkup =
  (query: Query) =>
  (text: string): HTMLElement =>
    query((content: string, node: Parameters<MatcherFunction>[1]) => {
      const hasText = (el: Parameters<MatcherFunction>[1]) => el?.textContent === text;
      const childrenDontHaveText = Array.from(node?.children ?? []).every(
        (child) => !hasText(child as HTMLElement)
      );
      return hasText(node) && childrenDontHaveText;
    });

interface FormTestComponentProps {
  formDefaultValue?: Record<string, unknown>;
  onSubmit?: jest.Mock;
  schema?: FormSchema<Record<string, unknown>>;
}

// eslint-disable-next-line react/display-name
export const FormTestComponent: React.FC<FormTestComponentProps> = ({
  children,
  onSubmit,
  formDefaultValue,
  schema,
}) => {
  const { form } = useForm({ onSubmit, defaultValue: formDefaultValue, schema });

  return (
    <Form form={form}>
      {children}
      <EuiButton onClick={() => form.submit()} data-test-subj="form-test-component-submit-button">
        {'Submit'}
      </EuiButton>
    </Form>
  );
};
