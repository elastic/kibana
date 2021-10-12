/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, render, waitFor } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/mock';
import { schema, FormProps } from './schema';
import { CreateCaseForm } from './form';
import { OwnerProvider } from '../owner_context';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');

const useGetTagsMock = useGetTags as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;

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

    return (
      <OwnerProvider owner={[SECURITY_SOLUTION_OWNER]}>
        <Form form={form}>{children}</Form>
      </OwnerProvider>
    );
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useGetTagsMock.mockReturnValue({ tags: ['test'] });
    useConnectorsMock.mockReturnValue({ loading: false, connectors: connectorsMock });
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
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

  it('hides the sync alerts toggle', () => {
    const { queryByText } = render(
      <MockHookWrapperComponent>
        <CreateCaseForm disableAlerts />
      </MockHookWrapperComponent>
    );

    expect(queryByText('Sync alert')).not.toBeInTheDocument();
  });
});
