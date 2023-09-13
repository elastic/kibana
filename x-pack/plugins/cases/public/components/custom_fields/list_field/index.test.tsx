/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../common/test_utils';
import { createListCustomFieldBuilder } from '.';
import type { CustomFieldBuildType } from '../types';
import * as i18n from '../translations';
import { getConfig } from '../field_options/config';

describe('createListCustomFieldBuilder ', () => {
  const onSubmit = jest.fn();
  const builder = createListCustomFieldBuilder({
    customFieldType: 'List',
  });

  const createdCustomField = builder.build();

  const { customFieldType, fieldOptions } = createdCustomField[0] as CustomFieldBuildType;

  const config = getConfig('List'); // field options config

  const checkboxOptions = [...Object.values(config)];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    // customFieldType
    expect(screen.getByTestId('custom-field-add-list-option-btn')).toBeInTheDocument();
    expect(screen.getByText(i18n.LIST_VALUES_LABEL)).toBeInTheDocument();

    // fieldOptions
    expect(screen.getByTestId('custom-field-options')).toBeInTheDocument();

    for (const option of checkboxOptions) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it('shows inline edit inside draggable on add option', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    expect(screen.getByTestId('droppable')).toBeInTheDocument();
    expect(screen.getByTestId('euiInlineEditModeInput')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-remove-list-option')).toBeInTheDocument();
  });

  it('updates option on save', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    userEvent.type(screen.getByTestId('euiInlineEditModeInput'), 'first');

    userEvent.click(screen.getByTestId('euiInlineEditModeSaveButton'));

    expect(screen.getByTestId('euiInlineReadModeButton')).toBeInTheDocument();
    expect(screen.getByText('first')).toBeInTheDocument();

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          List: [
            {
              content: 'first',
              id: '1',
            },
          ],
        },
        true
      );
    });
  });

  it('shows multiple options', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    userEvent.type(screen.getByTestId('euiInlineEditModeInput'), 'first');

    userEvent.click(screen.getByTestId('euiInlineEditModeSaveButton'));

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    userEvent.type(screen.getByTestId('euiInlineEditModeInput'), 'second');

    userEvent.click(screen.getByTestId('euiInlineEditModeSaveButton'));

    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('does not update option on cancel', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    userEvent.type(screen.getByTestId('euiInlineEditModeInput'), 'first');

    userEvent.click(screen.getByTestId('euiInlineEditModeCancelButton'));

    expect(screen.getByTestId('euiInlineReadModeButton')).toBeInTheDocument();
    expect(screen.queryByText('first')).not.toBeInTheDocument();
  });

  it('deletes option from list on delete', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('custom-field-add-list-option-btn'));

    userEvent.click(screen.getByTestId('custom-field-remove-list-option'));

    expect(screen.queryByTestId('droppable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('euiInlineEditModeInput')).not.toBeInTheDocument();
  });

  it('updates field options correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByText(checkboxOptions[0].label));

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          fieldOptions: { required_option: true },
        },
        true
      );
    });
  });
});
