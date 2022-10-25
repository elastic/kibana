/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { waitFor } from '@testing-library/react';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Tags } from './tags';
import type { FormProps } from './schema';
import { schema } from './schema';
import { TestProviders } from '../../common/mock';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock('../../common/lib/kibana');
jest.mock('../../containers/use_get_tags');

const useGetTagsMock = useGetTags as jest.Mock;

describe('Tags', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { tags: [] },
      schema: {
        tags: schema.tags,
      },
    });

    globalForm = form;

    return (
      <TestProviders>
        <Form form={form}>{children}</Form>
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetTagsMock.mockReturnValue({ data: ['test'] });
  });

  it('it renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="caseTags"]`).exists()).toBeTruthy();
    });
  });

  it('it disables the input when loading', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Tags isLoading={true} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(EuiComboBox).prop('disabled')).toBeTruthy();
  });

  it('it changes the tags', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Tags isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange(['test', 'case'].map((tag) => ({ label: tag })));
    });

    expect(globalForm.getFormData()).toEqual({ tags: ['test', 'case'] });
  });
});
