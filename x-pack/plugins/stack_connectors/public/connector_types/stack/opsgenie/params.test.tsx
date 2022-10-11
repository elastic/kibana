/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, render, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpsgenieParamFields from './params_useform';
import { OpsgenieSubActions } from '../../../../common';
import { OpsgenieActionParams } from '../../../../server/connector_types/stack';

describe('OpsgenieParamFields', () => {
  const editAction = jest.fn();
  const createAlertActionParams: OpsgenieActionParams = {
    subAction: OpsgenieSubActions.CreateAlert,
    subActionParams: { message: 'hello', alias: '123' },
  };

  const closeAlertActionParams: OpsgenieActionParams = {
    subAction: OpsgenieSubActions.CloseAlert,
    subActionParams: { alias: '456' },
  };

  const connector = {
    secrets: { apiKey: '123' },
    config: { apiUrl: 'http://test.com' },
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    isPreconfigured: false,
    isDeprecated: false,
  };

  const defaultCreateAlertProps = {
    actionParams: createAlertActionParams,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
  };

  const defaultCloseAlertProps = {
    actionParams: closeAlertActionParams,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create alert component', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-eventActionSelect'));

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
  });

  it('renders the close alert component', async () => {
    render(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-eventActionSelect'));

    expect(screen.queryByText('hello')).not.toBeInTheDocument();
    expect(screen.queryByText('123')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('456')).toBeInTheDocument();
  });

  it('calls editAction when the message field is changed', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    fireEvent.change(screen.getByText('hello'), { target: { value: 'a new message' } });

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "123",
          "message": "a new message",
        },
        0,
      ]
    `);
  });

  it('calls editAction when the alias field is changed for closeAlert', async () => {
    render(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    fireEvent.change(screen.getByDisplayValue('456'), { target: { value: 'a new alias' } });

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "a new alias",
        },
        0,
      ]
    `);
  });

  it('preserves the previous message value when switching between the create and close alert event actions', async () => {
    const { rerender } = render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('123'), { target: { value: 'a new alias' } });
    expect(editAction).toBeCalledTimes(1);

    rerender(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    expect(screen.queryByText('hello')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('456')).toBeInTheDocument();

    expect(editAction).toBeCalledTimes(1);

    // The action params should get overridden with the stored state action params
    // alias: 'a new alias' and message: 'hello'
    rerender(
      <OpsgenieParamFields
        {...{
          ...defaultCreateAlertProps,
          actionParams: {
            subAction: OpsgenieSubActions.CreateAlert,
            subActionParams: { alias: '123', message: 'message' },
          },
        }}
      />
    );

    expect(editAction.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "a new alias",
          "message": "hello",
        },
        0,
      ]
    `);
  });

  it('calls editAction when changing the subAction', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    act(() =>
      userEvent.selectOptions(
        screen.getByTestId('opsgenie-eventActionSelect'),
        screen.getByText('Close Alert')
      )
    );

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "subAction",
            "closeAlert",
            0,
          ]
      `);
  });
});
