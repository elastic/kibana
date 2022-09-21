/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { render } from '@testing-library/react';

import { ResponseActionsForm } from './response_actions_form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

const renderWithContext = (Element: React.ReactElement) => {
  return render(<IntlProvider locale={'en'}>{Element}</IntlProvider>);
};

describe('ResponseActionsForm', () => {
  const Component = (props: { items: ArrayItem[] }) => {
    const { form } = useForm();
    const saveClickRef = useRef<{ onSaveClick: () => Promise<boolean> | null }>({
      onSaveClick: () => null,
    });
    return (
      <Form form={form}>
        <ResponseActionsForm
          addItem={jest.fn()}
          removeItem={jest.fn()}
          saveClickRef={saveClickRef}
          {...props}
        />
      </Form>
    );
  };
  it('renders correctly', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(<Component items={[]} />);
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(getByTestId('response-actions-list'));
    expect(queryByTestId('response-actions-list-item-0')).toEqual(null);
  });
  it('renders list of elements', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(
      <Component
        items={[
          { path: '1', id: 1, isNew: false },
          { path: '2', id: 2, isNew: false },
        ]}
      />
    );
    const list = getByTestId('response-actions-list');
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(list);
    expect(queryByTestId('response-actions-list-item-0')).not.toEqual(null);
    expect(queryByTestId('response-actions-list-item-1')).not.toEqual(null);
  });
});
