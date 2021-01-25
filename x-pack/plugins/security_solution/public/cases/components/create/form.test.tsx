/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../../shared_imports';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/mock';
import { schema, FormProps } from './schema';
import { CreateCaseForm } from './form';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
const useGetTagsMock = useGetTags as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
  fields: null,
  syncAlerts: true,
};

describe('CreateCaseForm', () => {
  let globalForm: FormHook;
  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: initialCaseValue,
      options: { stripEmptyFields: false },
      schema,
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useGetTagsMock.mockReturnValue({ tags: ['test'] });
    useConnectorsMock.mockReturnValue({ loading: false, connectors: connectorsMock });
  });

  it('it renders with steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeTruthy();
  });

  it('it renders without steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm withSteps={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeFalsy();
  });

  it('it renders all form fields', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseTitle"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseTags"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseDescription"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseSyncAlerts"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
  });

  it('should render spinner when loading', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      globalForm.setFieldValue('title', 'title');
      globalForm.setFieldValue('description', 'description');
      globalForm.submit();
      // For some weird reason this is needed to pass the test.
      // It does not do anything useful
      await wrapper.find(`[data-test-subj="caseTitle"]`);
      await wrapper.update();
      await waitFor(() => {
        expect(
          wrapper.find(`[data-test-subj="create-case-loading-spinner"]`).exists()
        ).toBeTruthy();
      });
    });
  });
});
