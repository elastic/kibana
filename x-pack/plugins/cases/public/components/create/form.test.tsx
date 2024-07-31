/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within, fireEvent, waitFor, screen } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import {
  connectorsMock,
  customFieldsConfigurationMock,
  templatesConfigurationMock,
} from '../../containers/mock';
import type { CreateCaseFormProps } from './form';
import { CreateCaseForm } from './form';
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';
import { useGetAllCaseConfigurationsResponse } from '../configure_cases/__mock__';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import userEvent from '@testing-library/user-event';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles } from '../../containers/user_profiles/api.mock';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_get_all_case_configurations');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../markdown_editor/plugins/lens/use_lens_draft_comment');
jest.mock('../app/use_available_owners');

const useGetTagsMock = useGetTags as jest.Mock;
const useGetSupportedActionConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetAllCaseConfigurationsMock = useGetAllCaseConfigurations as jest.Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const casesFormProps: CreateCaseFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateCaseForm', () => {
  const draftStorageKey = 'cases.caseView.createCase.description.markdownEditor';
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability']);
    useGetTagsMock.mockReturnValue({ data: ['test'] });
    useGetSupportedActionConnectorsMock.mockReturnValue({ isLoading: false, data: connectorsMock });
    useGetAllCaseConfigurationsMock.mockImplementation(() => useGetAllCaseConfigurationsResponse);
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('renders with steps', async () => {
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(await screen.findByTestId('case-creation-form-steps')).toBeInTheDocument();
  });

  it('renders without steps', async () => {
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} withSteps={false} />);

    expect(screen.queryByText('case-creation-form-steps')).not.toBeInTheDocument();
  });

  it('renders all form fields except case selection', async () => {
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
    expect(screen.queryByText('caseOwnerSelector')).not.toBeInTheDocument();
  });

  it('renders all form fields including case selection if has permissions and no owner', async () => {
    appMockRenderer = createAppMockRenderer({ owner: [] });
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByTestId('categories-list')).toBeInTheDocument();
    expect(await screen.findByTestId('caseOwnerSelector')).toBeInTheDocument();
  });

  it('does not render solution picker when only one owner is available', async () => {
    useAvailableOwnersMock.mockReturnValue(['securitySolution']);

    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(screen.queryByTestId('caseOwnerSelector')).not.toBeInTheDocument();
  });

  it('hides the sync alerts toggle', async () => {
    appMockRenderer = createAppMockRenderer({ features: { alerts: { sync: false } } });
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(screen.queryByText('Sync alert')).not.toBeInTheDocument();
  });

  it('should not render the assignees on basic license', () => {
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);
    expect(screen.queryByTestId('createCaseAssigneesComboBox')).not.toBeInTheDocument();
  });

  it('should render the assignees on platinum license', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMockRenderer = createAppMockRenderer({ license });
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(await screen.findByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('should not prefill the form when no initialValue provided', async () => {
    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    const titleInput = within(await screen.findByTestId('caseTitle')).getByTestId('input');
    const descriptionInput = within(await screen.findByTestId('caseDescription')).getByRole(
      'textbox'
    );

    expect(titleInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
  });

  it('should render custom fields when available', async () => {
    useGetAllCaseConfigurationsMock.mockImplementation(() => ({
      ...useGetAllCaseConfigurationsResponse,
      data: [
        {
          ...useGetAllCaseConfigurationsResponse.data[0],
          customFields: customFieldsConfigurationMock,
        },
      ],
    }));

    appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    for (const item of customFieldsConfigurationMock) {
      expect(
        await screen.findByTestId(`${item.key}-${item.type}-create-custom-field`)
      ).toBeInTheDocument();
    }
  });

  it('should prefill the form when provided with initialValue', async () => {
    appMockRenderer.render(
      <CreateCaseForm
        {...casesFormProps}
        initialValue={{ title: 'title', description: 'description' }}
      />
    );

    const titleInput = within(await screen.findByTestId('caseTitle')).getByTestId('input');
    const descriptionInput = within(await screen.findByTestId('caseDescription')).getByRole(
      'textbox'
    );

    expect(titleInput).toHaveValue('title');
    expect(descriptionInput).toHaveValue('description');
  });

  describe('draft comment ', () => {
    it('should clear session storage key on cancel', async () => {
      appMockRenderer.render(
        <CreateCaseForm
          {...casesFormProps}
          initialValue={{ title: 'title', description: 'description' }}
        />
      );

      const cancelBtn = await screen.findByTestId('create-case-cancel');

      fireEvent.click(cancelBtn);

      fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      expect(casesFormProps.onCancel).toHaveBeenCalled();
      expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
    });

    it('should clear session storage key on submit', async () => {
      appMockRenderer.render(
        <CreateCaseForm
          {...casesFormProps}
          initialValue={{ title: 'title', description: 'description' }}
        />
      );

      const submitBtn = await screen.findByTestId('create-case-submit');

      fireEvent.click(submitBtn);

      waitFor(() => {
        expect(casesFormProps.onSuccess).toHaveBeenCalled();
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });
  });

  describe('templates', () => {
    beforeEach(() => {
      useGetAllCaseConfigurationsMock.mockReturnValue({
        ...useGetAllCaseConfigurationsResponse,
        data: [
          {
            ...useGetAllCaseConfigurationsResponse.data[0],
            customFields: [
              {
                key: 'first_custom_field_key',
                type: CustomFieldTypes.TEXT,
                required: false,
                label: 'My test label 1',
              },
            ],
            templates: templatesConfigurationMock,
          },
        ],
      });
    });

    it('should populate the cases fields correctly when selecting a case template', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });
      const selectedTemplate = templatesConfigurationMock[4];

      appMockRenderer = createAppMockRenderer({ license });
      appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

      userEvent.selectOptions(
        await screen.findByTestId('create-case-template-select'),
        selectedTemplate.name
      );

      const title = within(await screen.findByTestId('caseTitle')).getByTestId('input');
      const description = within(await screen.findByTestId('caseDescription')).getByRole('textbox');
      const tags = within(await screen.findByTestId('caseTags')).getByTestId('comboBoxInput');
      const category = within(await screen.findByTestId('caseCategory')).getByTestId(
        'comboBoxSearchInput'
      );
      const severity = await screen.findByTestId('case-severity-selection');
      const customField = await screen.findByTestId(
        'first_custom_field_key-text-create-custom-field'
      );

      expect(title).toHaveValue(selectedTemplate.caseFields?.title);
      expect(description).toHaveValue(selectedTemplate.caseFields?.description);
      expect(tags).toHaveTextContent(selectedTemplate.caseFields?.tags?.[0]!);
      expect(category).toHaveValue(selectedTemplate.caseFields?.category);
      expect(severity).toHaveTextContent('High');
      expect(customField).toHaveValue('this is a text field value');
      expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();

      expect(await screen.findByText('Jira')).toBeInTheDocument();
      expect(await screen.findByTestId('connector-fields-jira')).toBeInTheDocument();
    });

    it('changes templates correctly', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });
      const firstTemplate = templatesConfigurationMock[4];
      const secondTemplate = templatesConfigurationMock[2];

      appMockRenderer = createAppMockRenderer({ license });
      appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

      userEvent.selectOptions(
        await screen.findByTestId('create-case-template-select'),
        firstTemplate.name
      );

      const title = within(await screen.findByTestId('caseTitle')).getByTestId('input');
      const description = within(await screen.findByTestId('caseDescription')).getByRole('textbox');
      const tags = within(await screen.findByTestId('caseTags')).getByTestId('comboBoxInput');
      const category = within(await screen.findByTestId('caseCategory')).getByTestId(
        'comboBoxSearchInput'
      );
      const assignees = within(await screen.findByTestId('caseAssignees')).getByTestId(
        'comboBoxSearchInput'
      );
      const severity = await screen.findByTestId('case-severity-selection');
      const customField = await screen.findByTestId(
        'first_custom_field_key-text-create-custom-field'
      );

      expect(title).toHaveValue(firstTemplate.caseFields?.title);

      userEvent.selectOptions(
        await screen.findByTestId('create-case-template-select'),
        secondTemplate.name
      );

      expect(title).toHaveValue(secondTemplate.caseFields?.title);
      expect(description).not.toHaveValue();
      expect(tags).toHaveTextContent(secondTemplate.caseFields?.tags?.[0]!);
      expect(tags).toHaveTextContent(secondTemplate.caseFields?.tags?.[1]!);
      expect(category).not.toHaveValue();
      expect(severity).toHaveTextContent('Medium');
      expect(customField).not.toHaveValue();
      expect(assignees).not.toHaveValue();

      expect(screen.queryByText('Damaged Raccoon')).not.toBeInTheDocument();
      expect(screen.queryByText('Jira')).not.toBeInTheDocument();
      expect(screen.queryByTestId('connector-fields-jira')).not.toBeInTheDocument();

      expect(await screen.findByText('No connector selected')).toBeInTheDocument();
    });

    it('selects the placeholder empty template correctly', async () => {
      useGetAllCaseConfigurationsMock.mockReturnValue({
        ...useGetAllCaseConfigurationsResponse,
        data: [
          {
            ...useGetAllCaseConfigurationsResponse.data[0],
            customFields: [
              {
                key: 'first_custom_field_key',
                type: CustomFieldTypes.TEXT,
                required: false,
                label: 'My test label 1',
                defaultValue: 'custom field default value',
              },
            ],
            templates: templatesConfigurationMock,
            connector: {
              id: 'servicenow-1',
              name: 'My SN connector',
              type: ConnectorTypes.serviceNowITSM,
              fields: null,
            },
          },
        ],
      });

      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });
      const firstTemplate = templatesConfigurationMock[4];

      appMockRenderer = createAppMockRenderer({ license });
      appMockRenderer.render(<CreateCaseForm {...casesFormProps} />);

      userEvent.selectOptions(
        await screen.findByTestId('create-case-template-select'),
        firstTemplate.name
      );

      const title = within(await screen.findByTestId('caseTitle')).getByTestId('input');
      const description = within(await screen.findByTestId('caseDescription')).getByRole('textbox');
      const tags = within(await screen.findByTestId('caseTags')).getByTestId('comboBoxInput');
      const category = within(await screen.findByTestId('caseCategory')).getByTestId(
        'comboBoxSearchInput'
      );
      const assignees = within(await screen.findByTestId('caseAssignees')).getByTestId(
        'comboBoxSearchInput'
      );
      const severity = await screen.findByTestId('case-severity-selection');
      const customField = await screen.findByTestId(
        'first_custom_field_key-text-create-custom-field'
      );

      userEvent.selectOptions(
        await screen.findByTestId('create-case-template-select'),
        'No template selected'
      );

      expect(title).not.toHaveValue();
      expect(description).not.toHaveValue();
      expect(tags).not.toHaveValue();
      expect(category).not.toHaveValue();
      expect(severity).toHaveTextContent('Low');
      expect(assignees).not.toHaveValue();
      expect(customField).toHaveValue('custom field default value');
      expect(await screen.findByText('My SN connector')).toBeInTheDocument();
    });
  });
});
