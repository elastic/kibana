/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SubmitCaseButton } from './submit_button';
import type { FormProps } from './schema';
import { schema } from './schema';

describe('SubmitCaseButton', () => {
  const onSubmit = jest.fn();

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { title: 'My title' },
      schema: {
        title: schema.title,
      },
      onSubmit,
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="create-case-submit"]`).exists()).toBeTruthy();
  });

  it('it submits', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );
    wrapper.find(`button[data-test-subj="create-case-submit"]`).first().simulate('click');
    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('it disables when submitting', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );

    wrapper.find(`button[data-test-subj="create-case-submit"]`).first().simulate('click');
    await waitFor(() =>
      expect(
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().prop('isDisabled')
      ).toBeTruthy()
    );
  });

  it('it is loading when submitting', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );

    wrapper.find(`button[data-test-subj="create-case-submit"]`).first().simulate('click');
    await waitFor(() =>
      expect(
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().prop('isLoading')
      ).toBeTruthy()
    );
  });
});
