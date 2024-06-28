/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { CaseSeverity, ConnectorTypes } from '../../../common/types/domain';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetChoicesResponse } from '../create/mock';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import { TEMPLATE_FIELDS, CASE_FIELDS, CONNECTOR_FIELDS, CASE_SETTINGS } from './translations';
import { FormFields } from './form_fields';

jest.mock('../connectors/servicenow/use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('form fields', () => {
  let appMockRenderer: AppMockRenderer;
  const onSubmit = jest.fn();
  const formDefaultValue = { tags: [], templateTags: [] };
  const defaultProps = {
    connectors: connectorsMock,
    currentConfiguration: {
      closureType: 'close-by-user' as const,
      connector: {
        fields: null,
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
      },
      customFields: [],
      templates: [],
      mappings: [],
      version: '',
      id: '',
      owner: mockedTestProvidersOwner[0],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
  });

  it('renders all steps', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByText(TEMPLATE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CASE_FIELDS)).toBeInTheDocument();
    expect(await screen.findByText(CASE_SETTINGS)).toBeInTheDocument();
    expect(await screen.findByText(CONNECTOR_FIELDS)).toBeInTheDocument();
  });

  it('renders template fields correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('template-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-tags')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
  });

  it('renders case fields', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('renders case fields with existing value', async () => {
    appMockRenderer.render(
      <FormTestComponent
        formDefaultValue={{
          title: 'Case title',
          description: 'case description',
          tags: ['case-1', 'case-2'],
          category: 'new',
          severity: CaseSeverity.MEDIUM,
          templateTags: [],
        }}
        onSubmit={onSubmit}
      >
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await within(await screen.findByTestId('caseTitle')).findByTestId('input')).toHaveValue(
      'Case title'
    );

    const caseTags = await screen.findByTestId('caseTags');
    expect(await within(caseTags).findByTestId('comboBoxInput')).toHaveTextContent('case-1');
    expect(await within(caseTags).findByTestId('comboBoxInput')).toHaveTextContent('case-2');

    const category = await screen.findByTestId('caseCategory');
    expect(await within(category).findByTestId('comboBoxSearchInput')).toHaveValue('new');
    expect(await screen.findByTestId('case-severity-selection-medium')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toHaveTextContent('case description');
  });

  it('renders sync alerts correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseSyncAlerts')).toBeInTheDocument();
  });

  it('renders custom fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        customFields: customFieldsConfigurationMock,
      },
    };

    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('renders default connector correctly', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders connector and its fields correctly', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        connector: {
          id: 'servicenow-1',
          name: 'My SN connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
      },
    };

    appMockRenderer.render(
      <FormTestComponent
        formDefaultValue={{ ...formDefaultValue, connectorId: 'servicenow-1' }}
        onSubmit={onSubmit}
      >
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();
  });

  it('does not render sync alerts when feature is not enabled', () => {
    appMockRenderer = createAppMockRenderer({
      features: { alerts: { sync: false, enabled: true } },
    });

    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('caseSyncAlerts')).not.toBeInTheDocument();
  });

  it('calls onSubmit with template fields', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    const templateTags = await screen.findByTestId('template-tags');

    userEvent.paste(within(templateTags).getByRole('combobox'), 'first');
    userEvent.keyboard('{enter}');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          connectorId: 'none',
          tags: [],
          syncAlerts: true,
          name: 'Template 1',
          templateDescription: 'this is a first template',
          templateTags: ['first'],
        },
        true
      );
    });
  });

  it('calls onSubmit with case fields', async () => {
    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...defaultProps} />
      </FormTestComponent>
    );

    const caseTitle = await screen.findByTestId('caseTitle');
    userEvent.paste(within(caseTitle).getByTestId('input'), 'Case with Template 1');

    const caseDescription = await screen.findByTestId('caseDescription');
    userEvent.paste(
      within(caseDescription).getByTestId('euiMarkdownEditorTextArea'),
      'This is a case description'
    );

    const caseTags = await screen.findByTestId('caseTags');
    userEvent.paste(within(caseTags).getByRole('combobox'), 'template-1');
    userEvent.keyboard('{enter}');

    const caseCategory = await screen.findByTestId('caseCategory');
    userEvent.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: 'new',
          tags: ['template-1'],
          description: 'This is a case description',
          title: 'Case with Template 1',
          connectorId: 'none',
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });

  it('calls onSubmit with custom fields', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        customFields: customFieldsConfigurationMock,
      },
    };

    appMockRenderer.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[1];

    const textCustomField = await screen.findByTestId(
      `${textField.key}-${textField.type}-create-custom-field`
    );

    userEvent.clear(textCustomField);
    userEvent.paste(textCustomField, 'My text test value 1');

    userEvent.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          connectorId: 'none',
          customFields: {
            test_key_1: 'My text test value 1',
            test_key_2: false,
            test_key_4: false,
          },
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });

  it('calls onSubmit with connector fields', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        connector: {
          id: 'servicenow-1',
          name: 'My SN connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
      },
    };

    appMockRenderer.render(
      <FormTestComponent
        formDefaultValue={{ ...formDefaultValue, connectorId: 'servicenow-1' }}
        onSubmit={onSubmit}
      >
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();

    userEvent.selectOptions(await screen.findByTestId('severitySelect'), '3');

    userEvent.selectOptions(await screen.findByTestId('urgencySelect'), '2');

    userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['software']);

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          tags: [],
          category: null,
          connectorId: 'servicenow-1',
          fields: {
            category: 'software',
            severity: '3',
            urgency: '2',
            subcategory: null,
          },
          syncAlerts: true,
          templateTags: [],
        },
        true
      );
    });
  });
});
