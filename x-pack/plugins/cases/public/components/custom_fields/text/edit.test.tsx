/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { FormTestComponent } from '../../../common/test_utils';
import { Edit } from './edit';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../../common/constants';
import type { CaseCustomFieldText } from '../../../../common/types/domain';

describe('Edit ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = customFieldsMock[0] as CaseCustomFieldText;
  const customFieldConfiguration = customFieldsConfigurationMock[0];

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.getByTestId('case-text-custom-field-test_key_1')).toBeInTheDocument();
    expect(screen.getByTestId('case-text-custom-field-edit-button-test_key_1')).toBeInTheDocument();
    expect(screen.getByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(screen.getByText('My text test value 1')).toBeInTheDocument();
  });

  it('does not shows the edit button if the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-text-custom-field-edit-button-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('does not shows the edit button when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-text-custom-field-edit-button-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('shows the loading spinner when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.getByTestId('case-text-custom-field-loading-test_key_1')).toBeInTheDocument();
  });

  it('shows the no value text if the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.getByText('No "My test label 1" added')).toBeInTheDocument();
  });

  it('shows the no value text if the the value is null', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.getByText('No "My test label 1" added')).toBeInTheDocument();
  });

  it('does not show the value when the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('text-custom-field-view-test_key_1')).not.toBeInTheDocument();
  });

  it('does not show the value when the value is null', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('text-custom-field-view-test_key_1')).not.toBeInTheDocument();
  });

  it('does not show the form when the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-text-custom-field-submit-button-test_key_1')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('case-text-custom-field-cancel-button-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit when changing value', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.paste(screen.getByTestId('case-text-custom-field-form-field-test_key_1'), '!!!');

    await waitFor(() => {
      expect(
        screen.getByTestId('case-text-custom-field-submit-button-test_key_1')
      ).not.toBeDisabled();
    });

    userEvent.click(screen.getByTestId('case-text-custom-field-submit-button-test_key_1'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: ['My text test value 1!!!'],
      });
    });
  });

  it('sets the value to null if the text field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.clear(screen.getByTestId('case-text-custom-field-form-field-test_key_1'));

    await waitFor(() => {
      expect(
        screen.getByTestId('case-text-custom-field-submit-button-test_key_1')
      ).not.toBeDisabled();
    });

    userEvent.click(screen.getByTestId('case-text-custom-field-submit-button-test_key_1'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: null,
      });
    });
  });

  it('hides the form when clicking the cancel button', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));

    expect(screen.getByTestId('case-text-custom-field-form-field-test_key_1')).toBeInTheDocument();

    userEvent.click(screen.getByTestId('case-text-custom-field-cancel-button-test_key_1'));

    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('reset to initial value when canceling', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.paste(screen.getByTestId('case-text-custom-field-form-field-test_key_1'), '!!!');

    await waitFor(() => {
      expect(
        screen.getByTestId('case-text-custom-field-submit-button-test_key_1')
      ).not.toBeDisabled();
    });

    userEvent.click(screen.getByTestId('case-text-custom-field-cancel-button-test_key_1'));

    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    expect(screen.getByTestId('case-text-custom-field-form-field-test_key_1')).toHaveValue(
      'My text test value 1'
    );
  });

  it('shows validation error if the field is required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.clear(screen.getByTestId('case-text-custom-field-form-field-test_key_1'));

    await waitFor(() => {
      expect(screen.getByText('My test label 1 is required.')).toBeInTheDocument();
    });
  });

  it('does not shows a validation error if the field is not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.clear(screen.getByTestId('case-text-custom-field-form-field-test_key_1'));

    await waitFor(() => {
      expect(
        screen.getByTestId('case-text-custom-field-submit-button-test_key_1')
      ).not.toBeDisabled();
    });

    expect(screen.queryByText('My test label 1 is required.')).not.toBeInTheDocument();
  });

  it('shows validation error if the field is too long', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByTestId('case-text-custom-field-edit-button-test_key_1'));
    userEvent.clear(screen.getByTestId('case-text-custom-field-form-field-test_key_1'));
    userEvent.paste(
      screen.getByTestId('case-text-custom-field-form-field-test_key_1'),
      'a'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1)
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          `The length of the My test label 1 is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH} characters.`
        )
      ).toBeInTheDocument();
    });
  });
});
