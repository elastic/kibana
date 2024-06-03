/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderReactTestingLibraryWithI18n } from '@kbn/test-jest-helpers';
import { SecretFormRow } from './output_form_secret_form_row';

describe('SecretFormRow', () => {
  const title = 'Test Secret';
  const initialValue = 'initial value';
  const clear = jest.fn();
  const onToggleSecretStorage = jest.fn();
  const cancelEdit = jest.fn();
  const useSecretsStorage = true;

  it('should switch to edit mode when the replace button is clicked', () => {
    const { getByText, queryByText, container } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        initialValue={initialValue}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
      >
        <input id="myinput" type="text" value={initialValue} />
      </SecretFormRow>
    );

    expect(container.querySelector('#myinput')).not.toBeInTheDocument();

    fireEvent.click(getByText('Replace Test Secret'));

    expect(container.querySelector('#myinput')).toBeInTheDocument();
    expect(getByText(title)).toBeInTheDocument();
    expect(queryByText('Replace Test Secret')).not.toBeInTheDocument();
    expect(queryByText(initialValue)).not.toBeInTheDocument();
  });

  it('should not enable the replace button if the row is disabled', () => {
    const { getByText } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        initialValue={initialValue}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
        disabled={true}
      >
        <input id="myinput" type="text" value={initialValue} />
      </SecretFormRow>
    );

    expect(getByText('Replace Test Secret').closest('button')).toBeDisabled();
  });

  it('should call the cancelEdit function when the cancel button is clicked', () => {
    const { getByText } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        initialValue={initialValue}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
      >
        <input type="text" value={initialValue} />
      </SecretFormRow>
    );

    fireEvent.click(getByText('Replace Test Secret'));
    fireEvent.click(getByText('Cancel Test Secret change'));

    expect(cancelEdit).toHaveBeenCalled();
  });

  it('should call the onToggleSecretStorage function when the revert link is clicked', () => {
    const { getByText } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
      >
        <input type="text" />
      </SecretFormRow>
    );

    fireEvent.click(getByText('Click to use plain text storage instead'));

    expect(onToggleSecretStorage).toHaveBeenCalledWith(false);
  });

  it('should not display the cancel change button when no initial value is provided', () => {
    const { queryByTestId } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
        initialValue={''}
      >
        <input type="text" />
      </SecretFormRow>
    );

    expect(queryByTestId('secretCancelChangeBtn')).not.toBeInTheDocument();
  });

  it('should call the onToggleSecretStorage function when the use secret storage button is clicked in plain text mode', () => {
    const { getByText, queryByTestId } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        label={<div>Test Field</div>}
        useSecretsStorage={false}
        onToggleSecretStorage={onToggleSecretStorage}
      >
        <input type="text" />
      </SecretFormRow>
    );

    expect(queryByTestId('lockIcon')).not.toBeInTheDocument();
    expect(getByText('Test Field')).toBeInTheDocument();

    fireEvent.click(getByText('Click to use secret storage instead'));

    expect(onToggleSecretStorage).toHaveBeenCalledWith(true);
  });

  it('should display input normally and display a callout when the field is converted to secret storage', () => {
    const { getByText, queryByText } = renderReactTestingLibraryWithI18n(
      <SecretFormRow
        title={title}
        initialValue={initialValue}
        clear={clear}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        cancelEdit={cancelEdit}
        isConvertedToSecret={true}
      >
        <input type="text" value={initialValue} />
      </SecretFormRow>
    );

    expect(queryByText('Replace Test Secret')).not.toBeInTheDocument();
    expect(
      getByText('This field will be re-saved using secret storage from plain text storage.', {
        exact: false,
      })
    ).toBeInTheDocument();
  });
});
