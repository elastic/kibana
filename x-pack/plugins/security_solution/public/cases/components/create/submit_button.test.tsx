/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import { useForm, Form } from '../../../shared_imports';
import { SubmitCaseButton } from './submit_button';

describe('SubmitCaseButton', () => {
  const onSubmit = jest.fn();

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<{ title: string }>({
      defaultValue: { title: 'My title' },
      onSubmit,
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
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

    await act(async () => {
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
    });

    await waitFor(() => expect(onSubmit).toBeCalled());
  });

  it('it disables when submitting', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      expect(
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().prop('isDisabled')
      ).toBeTruthy();
    });
  });

  it('it is loading when submitting', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <SubmitCaseButton />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      wrapper.find(`[data-test-subj="create-case-submit"]`).first().simulate('click');
      expect(
        wrapper.find(`[data-test-subj="create-case-submit"]`).first().prop('isLoading')
      ).toBeTruthy();
    });
  });
});
