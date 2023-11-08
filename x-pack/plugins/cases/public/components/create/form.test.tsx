/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, render, within, fireEvent, waitFor } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { NONE_CONNECTOR_ID } from '../../../common/constants';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import type { FormProps } from './schema';
import { schema } from './schema';
import type { CreateCaseFormProps } from './form';
import { CreateCaseForm } from './form';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { TestProviders } from '../../common/mock';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useAvailableCasesOwners } from '../app/use_available_owners';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../app/use_available_owners');

const useGetTagsMock = useGetTags as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as jest.Mock;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: NONE_CONNECTOR_ID,
  fields: null,
  syncAlerts: true,
  assignees: [],
  customFields: {},
};

const casesFormProps: CreateCaseFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateCaseForm', () => {
  let globalForm: FormHook;
  const draftStorageKey = `cases.caseView.createCase.description.markdownEditor`;

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
      // @ts-expect-error ts upgrade v4.7.4
      <TestProviders {...testProviderProps}>
        <Form form={form}>{children}</Form>
      </TestProviders>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability']);
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
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
    expect(wrapper.find(`[data-test-subj="categories-list"]`).exists()).toBeTruthy();
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
    expect(wrapper.find(`[data-test-subj="categories-list"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="caseOwnerSelector"]`).exists()).toBeTruthy();
  });

  it('does not render solution picker when only one owner is available', async () => {
    useAvailableOwnersMock.mockReturnValue(['securitySolution']);

    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseOwnerSelector"]`).exists()).toBeFalsy();
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

  it('should not prefill the form when no initialValue provided', () => {
    const { getByTestId } = render(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    const titleInput = within(getByTestId('caseTitle')).getByTestId('input');
    const descriptionInput = within(getByTestId('caseDescription')).getByRole('textbox');
    expect(titleInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
  });

  it('should render custom fields when available', () => {
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: customFieldsConfigurationMock,
      },
    }));

    const result = render(
      <MockHookWrapperComponent>
        <CreateCaseForm {...casesFormProps} />
      </MockHookWrapperComponent>
    );

    expect(result.getByTestId('create-case-custom-fields')).toBeInTheDocument();

    for (const item of customFieldsConfigurationMock) {
      expect(
        result.getByTestId(`${item.key}-${item.type}-create-custom-field`)
      ).toBeInTheDocument();
    }
  });

  it('should prefill the form when provided with initialValue', () => {
    const { getByTestId } = render(
      <MockHookWrapperComponent>
        <CreateCaseForm
          {...casesFormProps}
          initialValue={{ title: 'title', description: 'description' }}
        />
      </MockHookWrapperComponent>
    );

    const titleInput = within(getByTestId('caseTitle')).getByTestId('input');
    const descriptionInput = within(getByTestId('caseDescription')).getByRole('textbox');

    expect(titleInput).toHaveValue('title');
    expect(descriptionInput).toHaveValue('description');
  });

  describe('draft comment ', () => {
    it('should clear session storage key on cancel', () => {
      const result = render(
        <MockHookWrapperComponent>
          <CreateCaseForm
            {...casesFormProps}
            initialValue={{ title: 'title', description: 'description' }}
          />
        </MockHookWrapperComponent>
      );

      const cancelBtn = result.getByTestId('create-case-cancel');

      fireEvent.click(cancelBtn);

      fireEvent.click(result.getByTestId('confirmModalConfirmButton'));

      expect(casesFormProps.onCancel).toHaveBeenCalled();
      expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
    });

    it('should clear session storage key on submit', () => {
      const result = render(
        <MockHookWrapperComponent>
          <CreateCaseForm
            {...casesFormProps}
            initialValue={{ title: 'title', description: 'description' }}
          />
        </MockHookWrapperComponent>
      );

      const submitBtn = result.getByTestId('create-case-submit');

      fireEvent.click(submitBtn);

      waitFor(() => {
        expect(casesFormProps.onSuccess).toHaveBeenCalled();
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });
  });
});
