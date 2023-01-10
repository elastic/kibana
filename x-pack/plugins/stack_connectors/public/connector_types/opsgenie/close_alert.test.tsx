/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, within, fireEvent, waitFor } from '@testing-library/react';
import { CloseAlert } from './close_alert';
import userEvent from '@testing-library/user-event';

describe('CloseAlert', () => {
  const editSubAction = jest.fn();
  const editOptionalSubAction = jest.fn();

  const options = {
    showSaveError: false,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    index: 0,
    editSubAction,
    editOptionalSubAction,
  };

  beforeEach(() => jest.clearAllMocks());

  it('does not render the additional options by default', () => {
    render(<CloseAlert {...options} />);

    expect(screen.queryByTestId('opsgenie-source-row')).not.toBeInTheDocument();
  });

  it('renders the form fields by default', () => {
    render(<CloseAlert {...options} />);

    expect(screen.getByTestId('opsgenie-alias-row')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('renders the form fields with the subActionParam values', () => {
    render(
      <CloseAlert
        {...{
          ...options,
          subActionParams: {
            alias: 'an alias',
            note: 'a note',
          },
        }}
      />
    );

    expect(
      within(screen.getByTestId('opsgenie-alias-row')).getByDisplayValue('an alias')
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('noteTextArea')).getByText('a note')).toBeInTheDocument();
  });

  it('renders the additional form fields with the subActionParam values', () => {
    render(
      <CloseAlert
        {...{
          ...options,
          subActionParams: {
            source: 'a source',
            user: 'a user',
          },
        }}
      />
    );

    userEvent.click(screen.getByTestId('opsgenie-display-more-options'));

    expect(
      within(screen.getByTestId('opsgenie-source-row')).getByDisplayValue('a source')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-user-row')).getByDisplayValue('a user')
    ).toBeInTheDocument();
  });

  it.each([
    ['alias', 'aliasInput', 'an alias', editSubAction],
    ['note', 'noteTextArea', 'a note', editOptionalSubAction],
    ['source', 'sourceInput', 'a source', editOptionalSubAction],
    ['user', 'userInput', 'a user', editOptionalSubAction],
  ])(
    'calls the callback for field %s data-test-subj %s with input %s',
    (field, dataTestSubj, input, callback) => {
      render(<CloseAlert {...options} />);

      userEvent.click(screen.getByTestId('opsgenie-display-more-options'));

      fireEvent.change(screen.getByTestId(dataTestSubj), { target: { value: input } });

      expect(callback.mock.calls[0]).toEqual([field, input, 0]);
    }
  );

  it('shows the additional options when clicking the more options button', () => {
    render(<CloseAlert {...options} />);

    userEvent.click(screen.getByTestId('opsgenie-display-more-options'));

    expect(screen.getByTestId('opsgenie-source-row')).toBeInTheDocument();
  });

  it('shows the message required error when showSaveError is true', async () => {
    render(
      <CloseAlert
        {...{
          ...options,
          showSaveError: true,
          errors: {
            'subActionParams.alias': ['MessageError'],
          },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MessageError')).toBeInTheDocument();
    });
  });
});
