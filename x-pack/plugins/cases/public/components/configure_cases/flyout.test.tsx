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
import { createAppMockRenderer } from '../../common/mock';
import type { FlyOutBodyProps } from './flyout';
import { CommonFlyout } from './flyout';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import {
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
} from '../../../common/constants';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';

import * as i18n from './translations';
import { FIELD_LABEL, DEFAULT_VALUE } from '../custom_fields/translations';
import { CustomFieldsForm } from '../custom_fields/form';
import { TemplateForm } from '../templates/form';
import type { TemplateFormProps } from '../templates/types';

describe('CommonFlyout ', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    onCloseFlyout: jest.fn(),
    onSaveField: jest.fn(),
    isLoading: false,
    disabled: false,
    data: null,
    renderHeader: () => <div>{`Flyout header`}</div>,
    renderBody: () => <div>{`This is a flyout body`}</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders flyout correctly', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-header')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-save')).toBeInTheDocument();
  });

  it('renders flyout header correctly', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent('Flyout header');
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(<CommonFlyout {...{ ...props, isLoading: true }} />);

    expect(await screen.findAllByRole('progressbar')).toHaveLength(2);
  });

  it('renders disable state correctly', async () => {
    appMockRender.render(<CommonFlyout {...{ ...props, disabled: true }} />);

    expect(await screen.findByTestId('common-flyout-cancel')).toBeDisabled();
    expect(await screen.findByTestId('common-flyout-save')).toBeDisabled();
  });

  it('calls onCloseFlyout on cancel', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    userEvent.click(await screen.findByTestId('common-flyout-cancel'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('calls onCloseFlyout on close', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    userEvent.click(await screen.findByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('does not call onSaveField when not valid data', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    userEvent.click(await screen.findByTestId('common-flyout-save'));

    expect(props.onSaveField).not.toBeCalled();
  });

  describe('CustomFieldsFlyout', () => {
    const renderBody = ({
      initialValue,
      onChange,
    }: FlyOutBodyProps<CustomFieldConfiguration | null>) => (
      <CustomFieldsForm onChange={onChange} initialValue={initialValue} />
    );

    const newProps = {
      ...props,
      renderBody,
    };

    it('should render custom field form in flyout', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      expect(await screen.findByTestId('custom-field-label-input')).toBeInTheDocument();
      expect(await screen.findByTestId('custom-field-type-selector')).toBeInTheDocument();
      expect(await screen.findByTestId('text-custom-field-required-wrapper')).toBeInTheDocument();
      expect(await screen.findByTestId('text-custom-field-default-value')).toBeInTheDocument();
    });

    it('calls onSaveField form correctly', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
      userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(newProps.onSaveField).toBeCalledWith({
          key: expect.anything(),
          label: 'Summary',
          required: false,
          type: CustomFieldTypes.TEXT,
        });
      });
    });

    it('shows error if field label is too long', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      const message = 'z'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

      userEvent.type(await screen.findByTestId('custom-field-label-input'), message);

      expect(
        await screen.findByText(
          i18n.MAX_LENGTH_ERROR(FIELD_LABEL.toLocaleLowerCase(), MAX_CUSTOM_FIELD_LABEL_LENGTH)
        )
      ).toBeInTheDocument();
    });

    describe('Text custom field', () => {
      it('calls onSaveField with correct params when a custom field is NOT required', async () => {
        appMockRender.render(<CommonFlyout {...newProps} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(newProps.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: false,
            type: CustomFieldTypes.TEXT,
          });
        });
      });

      it('calls onSaveField with correct params when a custom field is NOT required and has a default value', async () => {
        appMockRender.render(<CommonFlyout {...newProps} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.paste(
          await screen.findByTestId('text-custom-field-default-value'),
          'Default value'
        );
        userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(newProps.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: false,
            type: CustomFieldTypes.TEXT,
            defaultValue: 'Default value',
          });
        });
      });

      it('calls onSaveField with the correct params when a custom field is required', async () => {
        appMockRender.render(<CommonFlyout {...newProps} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('text-custom-field-required'));
        userEvent.paste(
          await screen.findByTestId('text-custom-field-default-value'),
          'Default value'
        );
        userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(newProps.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: true,
            type: CustomFieldTypes.TEXT,
            defaultValue: 'Default value',
          });
        });
      });

      it('calls onSaveField with the correct params when a custom field is required and the defaultValue is missing', async () => {
        appMockRender.render(<CommonFlyout {...newProps} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('text-custom-field-required'));
        userEvent.click(await screen.findByTestId('common-flyout-save'));

        await waitFor(() => {
          expect(newProps.onSaveField).toBeCalledWith({
            key: expect.anything(),
            label: 'Summary',
            required: true,
            type: CustomFieldTypes.TEXT,
          });
        });
      });

      it('renders flyout with the correct data when an initial customField value exists', async () => {
        const newRenderBody = ({
          initialValue,
          onChange,
        }: FlyOutBodyProps<CustomFieldConfiguration | null>) => (
          <CustomFieldsForm onChange={onChange} initialValue={initialValue} />
        );

        const modifiedProps = {
          ...props,
          data: customFieldsConfigurationMock[0],
          renderBody: newRenderBody,
        };

        appMockRender.render(<CommonFlyout {...modifiedProps} />);

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
        appMockRender.render(<CommonFlyout {...newProps} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('text-custom-field-required'));
        userEvent.paste(
          await screen.findByTestId('text-custom-field-default-value'),
          'z'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1)
        );

        expect(
          await screen.findByText(
            i18n.MAX_LENGTH_ERROR(DEFAULT_VALUE.toLowerCase(), MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH)
          )
        ).toBeInTheDocument();
      });
    });

    describe('Toggle custom field', () => {
      it('calls onSaveField with correct params when a custom field is NOT required', async () => {
        appMockRender.render(<CommonFlyout {...newProps} />);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('common-flyout-save'));

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
        appMockRender.render(<CommonFlyout {...newProps} />);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('toggle-custom-field-required'));
        userEvent.click(await screen.findByTestId('common-flyout-save'));

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
        const newRenderBody = ({
          initialValue,
          onChange,
        }: FlyOutBodyProps<CustomFieldConfiguration | null>) => (
          <CustomFieldsForm onChange={onChange} initialValue={initialValue} />
        );

        const modifiedProps = {
          ...props,
          data: customFieldsConfigurationMock[1],
          renderBody: newRenderBody,
        };

        appMockRender.render(<CommonFlyout {...modifiedProps} />);

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
    const renderBody = ({
      initialValue,
      onChange,
      configCustomFields,
      configConnectorId,
      configConnectors,
    }: FlyOutBodyProps<TemplateFormProps | null>) => (
      <TemplateForm
        initialValue={initialValue}
        connectors={configConnectors ?? []}
        configurationConnectorId={configConnectorId ?? 'none'}
        configurationCustomFields={configCustomFields ?? []}
        onChange={onChange}
      />
    );

    const newProps = {
      ...props,
      connectors: connectorsMock,
      configurationConnectorId: 'none',
      configurationCustomFields: [],
      renderBody,
    };

    it('should render template form in flyout', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
      expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
    });

    it('calls onSaveField form correctly', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      userEvent.paste(await screen.findByTestId('template-name-input'), 'Template name');
      userEvent.paste(
        await screen.findByTestId('template-description-input'),
        'Template description'
      );
      const templateTags = await screen.findByTestId('template-tags');
      userEvent.paste(within(templateTags).getByRole('combobox'), 'foo');
      userEvent.keyboard('{enter}');

      userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(newProps.onSaveField).toBeCalledWith({
          key: expect.anything(),
          name: 'Template name',
          templateDescription: 'Template description',
          templateTags: ['foo'],
          connectorId: 'none',
          syncAlerts: true,
        });
      });
    });

    it('calls onSaveField with case fields correctly', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      userEvent.paste(await screen.findByTestId('template-name-input'), 'Template name');
      userEvent.paste(
        await screen.findByTestId('template-description-input'),
        'Template description'
      );

      const caseTitle = await screen.findByTestId('caseTitle');
      userEvent.paste(within(caseTitle).getByTestId('input'), 'Case using template');

      const caseDescription = await screen.findByTestId('caseDescription');
      userEvent.paste(
        within(caseDescription).getByTestId('euiMarkdownEditorTextArea'),
        'This is a case description'
      );

      const caseCategory = await screen.findByTestId('caseCategory');
      userEvent.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

      userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(newProps.onSaveField).toBeCalledWith({
          key: expect.anything(),
          name: 'Template name',
          templateDescription: 'Template description',
          title: 'Case using template',
          description: 'This is a case description',
          category: 'new',
          connectorId: 'none',
          syncAlerts: true,
        });
      });
    });

    it('shows error when template name is empty', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      userEvent.paste(
        await screen.findByTestId('template-description-input'),
        'Template description'
      );

      userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(newProps.onSaveField).not.toHaveBeenCalled();
      });

      expect(await screen.findByText('A Template name is required.')).toBeInTheDocument();
    });

    it('shows error if template name is too long', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      const message = 'z'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1);

      userEvent.paste(await screen.findByTestId('template-name-input'), message);

      expect(
        await screen.findByText(i18n.MAX_LENGTH_ERROR('template name', MAX_TEMPLATE_NAME_LENGTH))
      ).toBeInTheDocument();
    });

    it('shows error when template description is empty', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      userEvent.paste(await screen.findByTestId('template-name-input'), 'Template name');

      userEvent.click(await screen.findByTestId('common-flyout-save'));

      await waitFor(() => {
        expect(newProps.onSaveField).not.toHaveBeenCalled();
      });

      expect(await screen.findByText('A Description is required.')).toBeInTheDocument();
    });

    it('shows error if template description is too long', async () => {
      appMockRender.render(<CommonFlyout {...newProps} />);

      const message = 'z'.repeat(MAX_TEMPLATE_DESCRIPTION_LENGTH + 1);

      userEvent.paste(await screen.findByTestId('template-description-input'), message);

      expect(
        await screen.findByText(
          i18n.MAX_LENGTH_ERROR('template description', MAX_TEMPLATE_DESCRIPTION_LENGTH)
        )
      ).toBeInTheDocument();
    });
  });
});
