/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { SecretFormRow } from './output_form_secret_form_row';

describe('SecretFormRow', () => {
  const title = 'Test Secret';
  const initialValue = 'initial value';
  const clear = jest.fn();
  const onToggleSecretStorage = jest.fn();
  const cancelEdit = jest.fn();
  const useSecretsStorage = true;

  it('should switch to edit mode when the replace button is clicked', () => {
    const { getByText, queryByText, container } = render(
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

  it('should call the cancelEdit function when the cancel button is clicked', () => {
    const { getByText } = render(
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
    const { getByText } = render(
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
    const { queryByTestId } = render(
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
    const { getByText, queryByTestId } = render(
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
});
