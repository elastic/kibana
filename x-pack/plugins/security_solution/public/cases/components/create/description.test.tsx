/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../../shared_imports';
import { Description } from './description';
import { schema, FormProps } from './schema';

describe('Description', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { description: 'My description' },
      schema: {
        description: schema.description,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('it renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Description isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseDescription"]`).exists()).toBeTruthy();
  });

  it('it changes the description', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Description isLoading={false} />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      wrapper
        .find(`[data-test-subj="caseDescription"] textarea`)
        .first()
        .simulate('change', { target: { value: 'My new description' } });
    });

    expect(globalForm.getFormData()).toEqual({ description: 'My new description' });
  });
});
