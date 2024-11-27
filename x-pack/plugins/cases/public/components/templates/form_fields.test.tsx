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
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

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

    await userEvent.click(await screen.findByTestId('template-name-input'));
    await userEvent.paste('Template 1');

    const templateTags = await screen.findByTestId('template-tags');

    await userEvent.click(within(templateTags).getByRole('combobox'));
    await userEvent.paste('first');
    await userEvent.keyboard('{enter}');

    await userEvent.click(await screen.findByTestId('template-description-input'));
    await userEvent.paste('this is a first template');

    await userEvent.click(screen.getByText('Submit'));

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
    await userEvent.click(within(caseTitle).getByTestId('input'));
    await userEvent.paste('Case with Template 1');

    const caseDescription = await screen.findByTestId('caseDescription');
    await userEvent.click(within(caseDescription).getByTestId('euiMarkdownEditorTextArea'));
    await userEvent.paste('This is a case description');

    const caseTags = await screen.findByTestId('caseTags');
    await userEvent.click(within(caseTags).getByRole('combobox'));
    await userEvent.paste('template-1');
    await userEvent.keyboard('{enter}');

    const caseCategory = await screen.findByTestId('caseCategory');
    await userEvent.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

    await userEvent.click(screen.getByText('Submit'));

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
    const numberField = customFieldsConfigurationMock[4];
    const listField = customFieldsConfigurationMock[6];

    const textCustomField = await screen.findByTestId(
      `${textField.key}-${textField.type}-create-custom-field`
    );

    await userEvent.clear(textCustomField);
    await userEvent.click(textCustomField);
    await userEvent.paste('My text test value 1');

    await userEvent.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    const numberCustomField = await screen.findByTestId(
      `${numberField.key}-${numberField.type}-create-custom-field`
    );

    await userEvent.clear(numberCustomField);
    await userEvent.click(numberCustomField);
    await userEvent.paste('987');

    const listCustomField = await screen.findByTestId(
      `${listField.key}-${listField.type}-create-custom-field`
    );

    await userEvent.selectOptions(
      listCustomField,
      await within(listCustomField).getByRole('option', { name: 'Option 2' })
    );

    await userEvent.click(screen.getByText('Submit'));

    // await waitFor(() => {
    expect(onSubmit).toBeCalledWith(
      {
        category: null,
        tags: [],
        connectorId: 'none',
        customFields: {
          test_key_1: 'My text test value 1',
          test_key_2: false,
          test_key_4: false,
          test_key_5: '987',
          test_key_7: 'option_2',
        },
        syncAlerts: true,
        templateTags: [],
      },
      true
    );
  });
  // });

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

    await userEvent.selectOptions(await screen.findByTestId('severitySelect'), '3');

    await userEvent.selectOptions(await screen.findByTestId('urgencySelect'), '2');

    await userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['software']);

    await userEvent.click(screen.getByText('Submit'));

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

  it('does not render duplicate template tags', async () => {
    const newProps = {
      ...defaultProps,
      currentConfiguration: {
        ...defaultProps.currentConfiguration,
        templates: [
          {
            key: 'test_template_1',
            name: 'Test',
            tags: ['one', 'two'],
            caseFields: {},
          },
          {
            key: 'test_template_2',
            name: 'Test 2',
            tags: ['one', 'three'],
            caseFields: {},
          },
        ],
      },
    };

    appMockRenderer.render(
      <FormTestComponent onSubmit={onSubmit} formDefaultValue={formDefaultValue}>
        <FormFields {...newProps} />
      </FormTestComponent>
    );

    const caseTags = await screen.findByTestId('template-tags');

    await userEvent.click(within(caseTags).getByTestId('comboBoxToggleListButton'));
    await waitForEuiPopoverOpen();

    /**
     * RTL will throw an error if there are more that one
     * element matching the text. This ensures that duplicated
     * tags are removed. Docs: https://testing-library.com/docs/queries/about
     */
    expect(await screen.findByText('one'));
    expect(await screen.findByText('two'));
    expect(await screen.findByText('three'));
  });
});
