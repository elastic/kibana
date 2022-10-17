/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, render } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { NONE_CONNECTOR_ID } from '../../../common/api';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { connectorsMock } from '../../containers/mock';
import type { FormProps } from './schema';
import { schema } from './schema';
import type { CreateCaseFormProps } from './form';
import { CreateCaseForm } from './form';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { TestProviders } from '../../common/mock';
import { useGetConnectors } from '../../containers/configure/use_connectors';
import { useGetTags } from '../../containers/use_get_tags';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
jest.mock('../../containers/configure/use_configure');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));

const useGetTagsMock = useGetTags as jest.Mock;
const useGetConnectorsMock = useGetConnectors as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: NONE_CONNECTOR_ID,
  fields: null,
  syncAlerts: true,
  assignees: [],
};

const casesFormProps: CreateCaseFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateCaseForm', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC<{ testProviderProps?: unknown }> = ({
    children,
    testProviderProps = {},
  }) => {
    const { form } = useForm<FormProps>({
      defaultValue: initialCaseValue,
      options: { stripEmptyFields: false },
      schema,
    });

    globalForm = form;

    return (
      <TestProviders {...testProviderProps}>
        <Form form={form}>{children}</Form>
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('renders with steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeTruthy();
  });

  it('renders without steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} withSteps={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeFalsy();
  });

  it('renders all form fields except case selection', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseTitle"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseTags"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseDescription"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseSyncAlerts"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseOwnerSelector"]`).exists()).toBeFalsy();
  });

  it('renders all form fields including case selection if has permissions and no owner', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent testProviderProps={{ owner: [] }}>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseTitle"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseTags"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseDescription"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseSyncAlerts"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseOwnerSelector"]`).exists()).toBeTruthy();
  });

  it('hides the sync alerts toggle', () => {
    const { queryByText } = render(
      <MockHookWrapperComponent testProviderProps={{ features: { alerts: { sync: false } } }}>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(queryByText('Sync alert')).not.toBeInTheDocument();
  });

  it('should render spinner when loading', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="create-case-submit"]`).exists()).toBeTruthy();

    await act(async () => {
      globalForm.setFieldValue('title', 'title');
      globalForm.setFieldValue('description', 'description');
      await wrapper.find(`button[data-test-subj="create-case-submit"]`).simulate('click');
      wrapper.update();
    });

    expect(wrapper.find(`[data-test-subj="create-case-loading-spinner"]`).exists()).toBeTruthy();
  });

  it('should not render the assignees on basic license', () => {
    const result = render(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(result.queryByTestId('createCaseAssigneesComboBox')).toBeNull();
  });

  it('should render the assignees on platinum license', () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    const result = render(
      <MockHookWrapperComponent testProviderProps={{ license }}>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });
});
