/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import {
  connectorsMock,
  customFieldsConfigurationMock,
  templatesConfigurationMock,
} from '../../containers/mock';
import {
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
} from '../../../common/constants';
import { ConnectorTypes, CustomFieldTypes } from '../../../common/types/domain';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetChoicesResponse } from '../create/mock';
import { FIELD_LABEL, DEFAULT_VALUE } from '../custom_fields/translations';
import { CustomFieldsForm } from '../custom_fields/form';
import { TemplateForm } from '../templates/form';
import * as i18n from './translations';
import type { FlyOutBodyProps } from './flyout';
import { CommonFlyout } from './flyout';
import type { TemplateFormProps } from '../templates/types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

jest.mock('../connectors/servicenow/use_get_choices');
jest.mock('../../containers/user_profiles/api');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('CommonFlyout ', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    onCloseFlyout: jest.fn(),
    onSaveField: jest.fn(),
    isLoading: false,
    disabled: false,
    renderHeader: () => <div>{`Flyout header`}</div>,
  };

  const children = ({ onChange }: FlyOutBodyProps<CustomFieldConfiguration>) => (
    <CustomFieldsForm onChange={onChange} initialValue={null} />
  );

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders flyout correctly', async () => {
    appMockRender.render(<CommonFlyout {...props}>{children}</CommonFlyout>);

    expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-header')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-save')).toBeInTheDocument();
  });

  it('renders flyout header correctly', async () => {
    appMockRender.render(<CommonFlyout {...props}>{children}</CommonFlyout>);

    expect(await screen.findByText('Flyout header'));
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(
      <CommonFlyout {...{ ...props, isLoading: true }}>{children}</CommonFlyout>
    );

    expect(await screen.findAllByRole('progressbar')).toHaveLength(2);
  });

  it('renders disable state correctly', async () => {
    appMockRender.render(<CommonFlyout {...{ ...props, disabled: true }}>{children}</CommonFlyout>);

    expect(await screen.findByTestId('common-flyout-cancel')).toBeDisabled();
    expect(await screen.findByTestId('common-flyout-save')).toBeDisabled();
  });

  it('calls onCloseFlyout on cancel', async () => {
    appMockRender.render(<CommonFlyout {...props}>{children}</CommonFlyout>);

    await userEvent.click(await screen.findByTestId('common-flyout-cancel'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('calls onCloseFlyout on close', async () => {
    appMockRender.render(<CommonFlyout {...props}>{children}</CommonFlyout>);

    await userEvent.click(await screen.findByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('does not call onSaveField when not valid data', async () => {
    appMockRender.render(<CommonFlyout {...props}>{children}</CommonFlyout>);

    await userEvent.click(await screen.findByTestId('common-flyout-save'));

    expect(props.onSaveField).not.toBeCalled();
  });

  describe('CustomFieldsFlyout', () => {
    const renderBody = ({ onChange }: FlyOutBodyProps<CustomFieldConfiguration>) => (
      <CustomFieldsForm onChange={onChange} initialValue={null} />
    );

    it('should render custom field form in flyout', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      expect(await screen.findByTestId('custom-field-label-input')).toBeInTheDocument();
      expect(await screen.findByTestId('custom-field-type-selector')).toBeInTheDocument();
      expect(await screen.findByTestId('text-custom-field-required-wrapper')).toBeInTheDocument();
      expect(await screen.findByTestId('text-custom-field-default-value')).toBeInTheDocument();
    });

    it('calls onSaveField form correctly', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      await userEvent.click(await screen.findByTestId('custom-field-label-input'));
      await userEvent.paste('Summary');
      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          key: expect.anything(),
          label: 'Summary',
          required: false,
          type: CustomFieldTypes.TEXT,
        });
      });
    });

    it('shows error if field label is too long', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      const message = 'z'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

      await userEvent.type(await screen.findByTestId('custom-field-label-input'), message);

      expect(
        await screen.findByText(
          i18n.MAX_LENGTH_ERROR(FIELD_LABEL.toLocaleLowerCase(), MAX_CUSTOM_FIELD_LABEL_LENGTH)
        )
      ).toBeInTheDocument();
    });

    describe('Text custom field', () => {
      it('calls onSaveField with correct params when a custom field is NOT required', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: false,
            type: CustomFieldTypes.TEXT,
          });
        });
      });

      it('calls onSaveField with correct params when a custom field is NOT required and has a default value', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
        await userEvent.paste('Default value');
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: false,
            type: CustomFieldTypes.TEXT,
            defaultValue: 'Default value',
          });
        });
      });

      it('calls onSaveField with the correct params when a custom field is required', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('text-custom-field-required'));
        await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
        await userEvent.paste('Default value');
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: true,
            type: CustomFieldTypes.TEXT,
            defaultValue: 'Default value',
          });
        });
      });

      it('calls onSaveField with the correct params when a custom field is required and the defaultValue is missing', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('text-custom-field-required'));
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: true,
            type: CustomFieldTypes.TEXT,
          });
        });
      });

      it('renders flyout with the correct data when an initial customField value exists', async () => {
        const newRenderBody = ({ onChange }: FlyOutBodyProps<CustomFieldConfiguration>) => (
          <CustomFieldsForm onChange={onChange} initialValue={customFieldsConfigurationMock[0]} />
        );

        const modifiedProps = {
          ...props,
          data: customFieldsConfigurationMock[0],
        };

        appMockRender.render(<CommonFlyout {...modifiedProps}>{newRenderBody}</CommonFlyout>);

        expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
          'value',
          customFieldsConfigurationMock[0].label
        );
        expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');
        expect(await screen.findByTestId('text-custom-field-required')).toHaveAttribute('checked');
        expect(await screen.findByTestId('text-custom-field-default-value')).toHaveAttribute(
          'value',
          customFieldsConfigurationMock[0].defaultValue
        );
      });

      it('shows an error if default value is too long', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('text-custom-field-required'));
        await userEvent.click(await screen.findByTestId('text-custom-field-default-value'));
        await userEvent.paste('z'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1));

        expect(
          await screen.findByText(
            i18n.MAX_LENGTH_ERROR(DEFAULT_VALUE.toLowerCase(), MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH)
          )
        ).toBeInTheDocument();
      });
    });

    describe('Toggle custom field', () => {
      it('calls onSaveField with correct params when a custom field is NOT required', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: false,
            type: CustomFieldTypes.TOGGLE,
            defaultValue: false,
          });
        });
      });

      it('calls onSaveField with the correct default value when a custom field is required', async () => {
        appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        await userEvent.click(await screen.findByTestId('custom-field-label-input'));
        await userEvent.paste('Summary');
        await userEvent.click(await screen.findByTestId('toggle-custom-field-required'));
        await userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(props.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: true,
            type: CustomFieldTypes.TOGGLE,
            defaultValue: false,
          });
        });
      });

      it('renders flyout with the correct data when an initial customField value exists', async () => {
        const newRenderBody = ({ onChange }: FlyOutBodyProps<CustomFieldConfiguration>) => (
          <CustomFieldsForm onChange={onChange} initialValue={customFieldsConfigurationMock[1]} />
        );

        appMockRender.render(<CommonFlyout {...props}>{newRenderBody}</CommonFlyout>);

        expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
          'value',
          customFieldsConfigurationMock[1].label
        );
        expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');
        expect(await screen.findByTestId('toggle-custom-field-required')).toHaveAttribute(
          'checked'
        );
        expect(await screen.findByTestId('toggle-custom-field-default-value')).toHaveAttribute(
          'aria-checked',
          'true'
        );
      });
    });
  });

  describe('TemplateFlyout', () => {
    const currentConfiguration = {
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
    };

    const renderBody = ({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
      <TemplateForm
        initialValue={null}
        connectors={connectorsMock}
        currentConfiguration={currentConfiguration}
        onChange={onChange}
      />
    );

    it('should render template form in flyout', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
      expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
    });

    it('should render all fields with details', async () => {
      const license = licensingMock.createLicense({
        license: { type: 'platinum' },
      });

      const newConfiguration = {
        ...currentConfiguration,
        customFields: [
          {
            key: 'first_custom_field_key',
            type: CustomFieldTypes.TEXT,
            label: 'First custom field',
            required: true,
          },
        ],
      };

      appMockRender = createAppMockRenderer({ license });

      appMockRender.render(
        <CommonFlyout {...props}>
          {({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
            <TemplateForm
              initialValue={templatesConfigurationMock[3]}
              connectors={[]}
              currentConfiguration={newConfiguration}
              onChange={onChange}
            />
          )}
        </CommonFlyout>
      );

      // template fields
      expect(await screen.findByTestId('template-name-input')).toHaveValue('Fourth test template');
      expect(await screen.findByTestId('template-description-input')).toHaveTextContent(
        'This is a fourth test template'
      );

      const templateTags = await screen.findByTestId('template-tags');
      expect(await within(templateTags).findByTestId('comboBoxInput')).toHaveTextContent('foo');
      expect(await within(templateTags).findByTestId('comboBoxInput')).toHaveTextContent('bar');

      const caseTitle = await screen.findByTestId('caseTitle');
      expect(within(caseTitle).getByTestId('input')).toHaveValue('Case with sample template 4');

      const caseDescription = await screen.findByTestId('caseDescription');
      expect(within(caseDescription).getByTestId('euiMarkdownEditorTextArea')).toHaveTextContent(
        'case desc'
      );

      const caseCategory = await screen.findByTestId('caseCategory');
      expect(within(caseCategory).getByRole('combobox')).toHaveTextContent('');

      const caseTags = await screen.findByTestId('caseTags');
      expect(await within(caseTags).findByTestId('comboBoxInput')).toHaveTextContent('sample-4');

      expect(await screen.findByTestId('case-severity-selection-low')).toBeInTheDocument();

      const assigneesComboBox = await screen.findByTestId('createCaseAssigneesComboBox');

      expect(await within(assigneesComboBox).findByTestId('comboBoxInput')).toHaveTextContent(
        'Damaged Raccoon'
      );

      // custom fields
      expect(
        await screen.findByTestId('first_custom_field_key-text-create-custom-field')
      ).toHaveValue('this is a text field value');

      // connector
      expect(await screen.findByTestId('dropdown-connector-no-connector')).toBeInTheDocument();
    });

    it('calls onSaveField form correctly', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      await userEvent.click(await screen.findByTestId('template-name-input'));
      await userEvent.paste('Template name');
      await userEvent.click(await screen.findByTestId('template-description-input'));
      await userEvent.paste('Template description');
      const templateTags = await screen.findByTestId('template-tags');
      await userEvent.click(within(templateTags).getByRole('combobox'));
      await userEvent.paste('foo');
      await userEvent.keyboard('{enter}');

      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          key: expect.anything(),
          caseFields: {
            connector: {
              fields: null,
              id: 'none',
              name: 'none',
              type: '.none',
            },
            customFields: [],
            settings: {
              syncAlerts: true,
            },
          },
          description: 'Template description',
          name: 'Template name',
          tags: ['foo'],
        });
      });
    });

    it('calls onSaveField with case fields correctly', async () => {
      const newRenderBody = ({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
        <TemplateForm
          initialValue={{
            key: 'random_key',
            name: 'Template 1',
            description: 'test description',
            caseFields: null,
          }}
          connectors={[]}
          currentConfiguration={currentConfiguration}
          onChange={onChange}
        />
      );

      appMockRender.render(<CommonFlyout {...props}>{newRenderBody}</CommonFlyout>);

      const caseTitle = await screen.findByTestId('caseTitle');
      await userEvent.click(within(caseTitle).getByTestId('input'));
      await userEvent.paste('Case using template');

      const caseDescription = await screen.findByTestId('caseDescription');
      await userEvent.click(within(caseDescription).getByTestId('euiMarkdownEditorTextArea'));
      await userEvent.paste('This is a case description');

      const caseCategory = await screen.findByTestId('caseCategory');
      await userEvent.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          key: 'random_key',
          name: 'Template 1',
          description: 'test description',
          tags: [],
          caseFields: {
            title: 'Case using template',
            description: 'This is a case description',
            category: 'new',
            connector: {
              fields: null,
              id: 'none',
              name: 'none',
              type: '.none',
            },
            customFields: [],
            settings: {
              syncAlerts: true,
            },
          },
        });
      });
    });

    it('calls onSaveField form with custom fields correctly', async () => {
      const newConfig = { ...currentConfiguration, customFields: customFieldsConfigurationMock };
      const newRenderBody = ({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
        <TemplateForm
          initialValue={{
            key: 'random_key',
            name: 'Template 1',
            description: 'test description',
            caseFields: null,
          }}
          connectors={[]}
          currentConfiguration={newConfig}
          onChange={onChange}
        />
      );

      appMockRender.render(<CommonFlyout {...props}>{newRenderBody}</CommonFlyout>);

      const textCustomField = await screen.findByTestId(
        `${customFieldsConfigurationMock[0].key}-text-create-custom-field`
      );

      await userEvent.clear(textCustomField);
      await userEvent.click(textCustomField);
      await userEvent.paste('this is a sample text!');

      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          key: 'random_key',
          name: 'Template 1',
          description: 'test description',
          tags: [],
          caseFields: {
            connector: {
              id: 'none',
              name: 'none',
              type: '.none',
              fields: null,
            },
            settings: {
              syncAlerts: true,
            },
            customFields: [
              {
                key: 'test_key_1',
                type: 'text',
                value: 'this is a sample text!',
              },
              {
                key: 'test_key_2',
                type: 'toggle',
                value: true,
              },
              {
                key: 'test_key_3',
                type: 'text',
                value: null,
              },
              {
                key: 'test_key_4',
                type: 'toggle',
                value: false,
              },
            ],
          },
        });
      });
    });

    it('calls onSaveField form with connector fields correctly', async () => {
      useGetChoicesMock.mockReturnValue(useGetChoicesResponse);

      const connector = {
        id: 'servicenow-1',
        name: 'My SN connector',
        type: ConnectorTypes.serviceNowITSM,
        fields: null,
      };

      const newConfig = {
        ...currentConfiguration,
        connector,
      };

      const newRenderBody = ({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
        <TemplateForm
          initialValue={{
            key: 'random_key',
            name: 'Template 1',
            description: 'test description',
            caseFields: { connector },
          }}
          connectors={connectorsMock}
          currentConfiguration={newConfig}
          onChange={onChange}
        />
      );

      appMockRender.render(<CommonFlyout {...props}>{newRenderBody}</CommonFlyout>);

      expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();

      await userEvent.selectOptions(await screen.findByTestId('urgencySelect'), '1');
      await userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['software']);
      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          key: 'random_key',
          name: 'Template 1',
          description: 'test description',
          tags: [],
          caseFields: {
            customFields: [],
            connector: {
              ...connector,
              fields: {
                urgency: '1',
                severity: null,
                impact: null,
                category: 'software',
                subcategory: null,
              },
            },
            settings: {
              syncAlerts: true,
            },
          },
        });
      });
    });

    it('calls onSaveField with edited fields correctly', async () => {
      const newConfig = {
        ...currentConfiguration,
        customFields: [
          {
            key: 'first_custom_field_key',
            type: CustomFieldTypes.TEXT,
            label: 'First custom field',
            required: true,
          },
        ],
        connector: {
          id: 'servicenow-1',
          name: 'My SN connector',
          type: ConnectorTypes.serviceNowITSM,
          fields: null,
        },
      };

      const newRenderBody = ({ onChange }: FlyOutBodyProps<TemplateFormProps>) => (
        <TemplateForm
          initialValue={templatesConfigurationMock[3]}
          connectors={connectorsMock}
          currentConfiguration={newConfig}
          onChange={onChange}
          isEditMode={true}
        />
      );

      appMockRender.render(<CommonFlyout {...props}>{newRenderBody}</CommonFlyout>);

      await userEvent.clear(await screen.findByTestId('template-name-input'));
      await userEvent.click(await screen.findByTestId('template-name-input'));
      await userEvent.paste('Template name');

      const caseTitle = await screen.findByTestId('caseTitle');
      await userEvent.clear(within(caseTitle).getByTestId('input'));
      await userEvent.click(within(caseTitle).getByTestId('input'));
      await userEvent.paste('Updated case using template');

      const customField = await screen.findByTestId(
        'first_custom_field_key-text-create-custom-field'
      );
      await userEvent.clear(customField);
      await userEvent.click(customField);
      await userEvent.paste('Updated custom field value');

      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).toBeCalledWith({
          caseFields: {
            connector: {
              fields: null,
              id: 'none',
              name: 'none',
              type: '.none',
            },
            customFields: [
              {
                key: 'first_custom_field_key',
                type: 'text',
                value: 'Updated custom field value',
              },
            ],
            description: 'case desc',
            settings: {
              syncAlerts: true,
            },
            severity: 'low',
            tags: ['sample-4'],
            title: 'Updated case using template',
          },
          description: 'This is a fourth test template',
          key: 'test_template_4',
          name: 'Template name',
          tags: ['foo', 'bar'],
        });
      });
    });

    it('shows error when template name is empty', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      await userEvent.click(await screen.findByTestId('template-description-input'));
      await userEvent.paste('Template description');

      await userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(props.onSaveField).not.toHaveBeenCalled();
      });

      expect(await screen.findByText('Template name is required.')).toBeInTheDocument();
    });

    it('shows error if template name is too long', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      const message = 'z'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1);

      await userEvent.click(await screen.findByTestId('template-name-input'));
      await userEvent.paste(message);

      expect(
        await screen.findByText(i18n.MAX_LENGTH_ERROR('template name', MAX_TEMPLATE_NAME_LENGTH))
      ).toBeInTheDocument();
    });

    it('shows error if template description is too long', async () => {
      appMockRender.render(<CommonFlyout {...props}>{renderBody}</CommonFlyout>);

      const message = 'z'.repeat(MAX_TEMPLATE_DESCRIPTION_LENGTH + 1);

      await userEvent.click(await screen.findByTestId('template-description-input'));
      await userEvent.paste(message);

      expect(
        await screen.findByText(
          i18n.MAX_LENGTH_ERROR('template description', MAX_TEMPLATE_DESCRIPTION_LENGTH)
        )
      ).toBeInTheDocument();
    });
  });
});
