/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { Title } from './title';
import { schema, FormProps } from './schema';

describe('Title', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { title: 'My title' },
      schema: {
        title: schema.title,
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
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseTitle"]`).exists()).toBeTruthy();
  });

  it('it disables the input when loading', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Title isLoading={true} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseTitle"] input`).prop('disabled')).toBeTruthy();
  });

  it('it changes the title', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Title isLoading={false} />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      wrapper
        .find(`[data-test-subj="caseTitle"] input`)
        .first()
        .simulate('change', { target: { value: 'My new title' } });
    });

    expect(globalForm.getFormData()).toEqual({ title: 'My new title' });
  });
});
