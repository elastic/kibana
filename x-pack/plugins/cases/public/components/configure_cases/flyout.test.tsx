/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CommonFlyout } from './flyout';
import { customFieldsConfigurationMock } from '../../containers/mock';
import {
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
} from '../../../common/constants';
import { CustomFieldTypes } from '../../../common/types/domain';

import * as i18n from './translations';
import { FIELD_LABEL, DEFAULT_VALUE, REQUIRED_FIELD } from '../custom_fields/translations';

describe('CommonFlyout ', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    onCloseFlyout: jest.fn(),
    onSaveField: jest.fn(),
    isLoading: false,
    disabled: false,
    data: null,
    type: 'customField' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders custom field correctly', async () => {
    appMockRender.render(<CommonFlyout {...props} />);

    expect(await screen.findByTestId(`${props.type}Flyout`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${props.type}FlyoutHeader`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${props.type}FlyoutCancel`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${props.type}FlyoutSave`)).toBeInTheDocument();
  });

  it('renders template flyout correctly', async () => {
    const newProps = {
      ...props,
      type: 'template' as const,
    };
    appMockRender.render(<CommonFlyout {...newProps} />);

    expect(await screen.findByTestId(`${newProps.type}Flyout`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${newProps.type}FlyoutHeader`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${newProps.type}FlyoutCancel`)).toBeInTheDocument();
    expect(await screen.findByTestId(`${newProps.type}FlyoutSave`)).toBeInTheDocument();
  });

  describe('CustomFieldsFlyout', () => {
    it('shows error if field label is too long', async () => {
      appMockRender.render(<CommonFlyout {...props} />);

      const message = 'z'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

      userEvent.type(await screen.findByTestId('custom-field-label-input'), message);

      expect(
        await screen.findByText(
          i18n.MAX_LENGTH_ERROR(FIELD_LABEL.toLocaleLowerCase(), MAX_CUSTOM_FIELD_LABEL_LENGTH)
        )
      ).toBeInTheDocument();
    });

    it('does not call onSaveField when error', async () => {
      appMockRender.render(<CommonFlyout {...props} />);

      userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

      expect(
        await screen.findByText(REQUIRED_FIELD(FIELD_LABEL.toLocaleLowerCase()))
      ).toBeInTheDocument();

      expect(props.onSaveField).not.toBeCalled();
    });

    it('calls onCloseFlyout on cancel', async () => {
      appMockRender.render(<CommonFlyout {...props} />);

      userEvent.click(await screen.findByTestId(`${props.type}FlyoutCancel`));

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

    describe('Text custom field', () => {
      it('calls onSaveField with correct params when a custom field is NOT required', async () => {
        appMockRender.render(<CommonFlyout {...props} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(<CommonFlyout {...props} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.paste(
          await screen.findByTestId('text-custom-field-default-value'),
          'Default value'
        );
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(<CommonFlyout {...props} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('text-custom-field-required'));
        userEvent.paste(
          await screen.findByTestId('text-custom-field-default-value'),
          'Default value'
        );
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(<CommonFlyout {...props} />);

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('text-custom-field-required'));
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(
          <CommonFlyout {...{ ...props, customField: customFieldsConfigurationMock[0] }} />
        );

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
        appMockRender.render(<CommonFlyout {...props} />);

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
        appMockRender.render(<CommonFlyout {...props} />);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(<CommonFlyout {...props} />);

        fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
          target: { value: CustomFieldTypes.TOGGLE },
        });

        userEvent.paste(await screen.findByTestId('custom-field-label-input'), 'Summary');
        userEvent.click(await screen.findByTestId('toggle-custom-field-required'));
        userEvent.click(await screen.findByTestId(`${props.type}FlyoutSave`));

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
        appMockRender.render(
          <CommonFlyout {...{ ...props, customField: customFieldsConfigurationMock[1] }} />
        );

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
});
