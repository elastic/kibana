/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, within, fireEvent, waitFor } from '@testing-library/react';
import JsonEditor from './json_editor';
import { MockCodeEditor } from '@kbn/triggers-actions-ui-plugin/public/application/code_editor.mock';

const kibanaReactPath = '../../../../../../../src/plugins/kibana_react/public';

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

describe('JsonEditor', () => {
  const editAction = jest.fn();

  const options = {
    index: 0,
    editAction,
  };

  beforeEach(() => jest.clearAllMocks());

  it('sets the default value for the json editor to {}', () => {
    render(<JsonEditor {...options} />);

    expect(
      within(screen.getByTestId('actionJsonEditor')).getByDisplayValue('{}')
    ).toBeInTheDocument();
  });

  it('displays an error for the message field initially', async () => {
    render(<JsonEditor {...options} />);

    await waitFor(() => {
      expect(
        screen.getByText('[message]: expected value of type [string] but got [undefined]')
      ).toBeInTheDocument();
    });
  });

  it('calls editActions setting the error state to true', async () => {
    render(<JsonEditor {...options} />);

    await waitFor(() => {
      expect(
        screen.getByText('[message]: expected value of type [string] but got [undefined]')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith('jsonEditorError', true, 0);
    });
  });

  it('calls editActions setting the error state to true twice', async () => {
    render(<JsonEditor {...options} />);

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: 'invalid json' },
    });

    // first time is from the useEffect, second is from the fireEvent
    expect(editAction.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "jsonEditorError",
          true,
          0,
        ],
        Array [
          "jsonEditorError",
          true,
          0,
        ],
      ]
    `);
  });

  it('calls the callback when the json input is valid', async () => {
    render(<JsonEditor {...options} />);

    const validJson = JSON.stringify({ message: 'awesome' });

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: validJson },
    });

    expect(editAction).toHaveBeenCalledWith('subActionParams', { message: 'awesome' }, 0);
  });

  it('does not show an error when the message field is a valid non empty string', async () => {
    render(<JsonEditor {...options} />);

    const validJson = JSON.stringify({ message: 'awesome' });

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: validJson },
    });

    expect(
      screen.queryByText('[message]: expected value of type [string] but got [undefined]')
    ).not.toBeInTheDocument();
  });

  it('shows an error when the message field is only spaces', async () => {
    render(<JsonEditor {...options} />);

    const validJson = JSON.stringify({ message: '  ' });

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: validJson },
    });

    expect(
      screen.getByText('[message]: must be populated with a value other than just whitespace')
    ).toBeInTheDocument();
  });

  it('calls editAction setting editor error to true when validation fails', async () => {
    render(<JsonEditor {...options} />);

    const validJson = JSON.stringify({
      tags: 'tags should be an array not a string',
      message: 'a message',
    });

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: validJson },
    });

    expect(
      screen.getByText('Invalid value "tags should be an array not a string" supplied to "tags"')
    ).toBeInTheDocument();
    expect(editAction.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "jsonEditorError",
          true,
          0,
        ],
        Array [
          "jsonEditorError",
          true,
          0,
        ],
      ]
    `);
  });

  it('calls the callback with only the message field after editing the json', async () => {
    render(
      <JsonEditor
        {...{
          ...options,
          subActionParams: {
            message: 'a message',
            alias: 'an alias',
          },
        }}
      />
    );

    const validJson = JSON.stringify({
      message: 'a new message',
    });

    fireEvent.change(screen.getByTestId('subActionParamsJsonEditor'), {
      target: { value: validJson },
    });

    expect(editAction).toHaveBeenCalledWith('subActionParams', { message: 'a new message' }, 0);
  });

  it('sets the editor error to undefined when validation succeeds', async () => {
    render(
      <JsonEditor
        {...{
          ...options,
          subActionParams: {
            message: 'a message',
            alias: 'an alias',
          },
        }}
      />
    );

    await waitFor(() => {
      expect(editAction.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "jsonEditorError",
            undefined,
            0,
          ],
        ]
      `);
    });
  });
});
