/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, within, fireEvent, waitFor } from '@testing-library/react';
import { CreateAlert } from '.';
import userEvent from '@testing-library/user-event';

describe('CreateAlert', () => {
  const editSubAction = jest.fn();
  const editAction = jest.fn();
  const editOptionalSubAction = jest.fn();

  const options = {
    showSaveError: false,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    index: 0,
    editAction,
    editSubAction,
    editOptionalSubAction,
  };

  beforeEach(() => jest.clearAllMocks());

  it('does not render the json editor by default', () => {
    render(<CreateAlert {...options} />);

    expect(screen.queryByTestId('actionJsonEditor')).not.toBeInTheDocument();
  });

  it('does not render the additional options by default', () => {
    render(<CreateAlert {...options} />);

    expect(screen.queryByTestId('opsgenie-entity-row')).not.toBeInTheDocument();
  });

  it('renders the form fields by default', () => {
    render(<CreateAlert {...options} />);

    expect(screen.getByTestId('opsgenie-message-row')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-alias-row')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-tags')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-prioritySelect')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders the form fields with the subActionParam values', () => {
    render(
      <CreateAlert
        {...{
          ...options,
          subActionParams: {
            message: 'a message',
            tags: ['super tag'],
            alias: 'an alias',
            description: 'a description',
          },
        }}
      />
    );

    expect(within(screen.getByTestId('opsgenie-tags')).getByText('super tag')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-message-row')).getByDisplayValue('a message')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('opsgenie-alias-row')).getByDisplayValue('an alias')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('descriptionTextArea')).getByText('a description')
    ).toBeInTheDocument();
  });

  it.each([
    ['message', 'messageInput', 'a message', editSubAction],
    ['alias', 'aliasInput', 'an alias', editOptionalSubAction],
    ['description', 'descriptionTextArea', 'a description', editOptionalSubAction],
  ])(
    'calls the callback for field %s data-test-subj %s with input %s',
    (field, dataTestSubj, input, callback) => {
      render(<CreateAlert {...options} />);

      fireEvent.change(screen.getByTestId(dataTestSubj), { target: { value: input } });

      expect(callback.mock.calls[0]).toEqual([field, input, 0]);
    }
  );

  it('shows the json editor when clicking the editor toggle', async () => {
    render(<CreateAlert {...options} />);

    userEvent.click(screen.getByTestId('opsgenie-show-json-editor-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('actionJsonEditor')).toBeInTheDocument();
      expect(screen.queryByTestId('opsgenie-message-row')).not.toBeInTheDocument();
      expect(screen.queryByTestId('opsgenie-alias-row')).not.toBeInTheDocument();
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });
  });

  it('shows the additional options when clicking the more options button', () => {
    render(<CreateAlert {...options} />);

    userEvent.click(screen.getByTestId('opsgenie-display-more-options'));

    expect(screen.getByTestId('opsgenie-entity-row')).toBeInTheDocument();
  });

  it('sets the json editor error to undefined when the toggle is switched off', async () => {
    render(<CreateAlert {...options} />);

    userEvent.click(screen.getByTestId('opsgenie-show-json-editor-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('actionJsonEditor')).toBeInTheDocument();
    });

    userEvent.click(screen.getByTestId('opsgenie-show-json-editor-toggle'));

    await waitFor(() => {
      expect(screen.queryByTestId('actionJsonEditor')).not.toBeInTheDocument();
      // first call to edit actions is because the editor was rendered and validation failed
      expect(editAction.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "jsonEditorError",
            true,
            0,
          ],
          Array [
            "jsonEditorError",
            undefined,
            0,
          ],
        ]
      `);
    });
  });

  it('shows the message required error when showSaveError is true', async () => {
    render(
      <CreateAlert
        {...{
          ...options,
          showSaveError: true,
          errors: {
            'subActionParams.message': ['MessageError'],
          },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MessageError')).toBeInTheDocument();
    });
  });
});
