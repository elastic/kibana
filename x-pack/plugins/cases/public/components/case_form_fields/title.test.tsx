/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Title } from './title';
import { schema } from '../create/schema';
import type { CaseFormFieldsSchemaProps } from './schema';

// FLAKY: https://github.com/elastic/kibana/issues/187364
describe.skip('Title', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { form } = useForm<CaseFormFieldsSchemaProps>({
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
