/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SlackParamsFields from './slack_params';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';

const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>(
  jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
    isLoading: false,
    response: {
      channels: [
        {
          id: 'id',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      ],
    },
    error: null,
  }))
);

const mockToasts = { danger: jest.fn(), warning: jest.fn() };
jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useSubAction: (params: UseSubActionParams<unknown>) => mockUseSubAction(params),
    useKibana: () => ({
      ...original.useKibana(),
      notifications: { toasts: mockToasts },
    }),
  };
});

describe('SlackParamsFields renders', () => {
  test('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const editAction = jest.fn();
    const { rerender } = render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={editAction}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
          useDefaultMessage={true}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('webApiTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextArea')).toHaveValue('some text');
    rerender(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={editAction}
          index={0}
          defaultMessage="some different default message"
          messageVariables={[]}
          useDefaultMessage={true}
        />
      </IntlProvider>
    );
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { channels: ['general'], text: 'some different default message' },
      0
    );
  });

  test('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed, Web API', () => {
    const editAction = jest.fn();
    const { rerender } = render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={editAction}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
          useDefaultMessage={false}
        />
      </IntlProvider>
    );
    expect(screen.getByTestId('webApiTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextArea')).toHaveValue('some text');

    rerender(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={editAction}
          index={0}
          defaultMessage="some different default message"
          messageVariables={[]}
          useDefaultMessage={false}
        />
      </IntlProvider>
    );
    expect(editAction).not.toHaveBeenCalled();
  });

  test('all params fields is rendered for postMessage call', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={() => {}}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('webApiTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextArea')).toHaveValue('some text');
  });

  test('all params fields is rendered for getChannels call', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: [], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={() => {}}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('slackChannelsButton')).toHaveTextContent('Channels');
    fireEvent.click(screen.getByTestId('slackChannelsButton'));
    expect(screen.getByTestId('slackChannelsSelectableList')).toBeInTheDocument();
    expect(screen.getByTestId('slackChannelsSelectableList')).toHaveTextContent('general');
    fireEvent.click(screen.getByText('general'));
    expect(screen.getByTitle('general').getAttribute('aria-checked')).toEqual('true');
  });

  test('show error message when no channel is selected', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: [], text: 'some text' },
          }}
          errors={{ message: [], channels: ['my error message'] }}
          editAction={() => {}}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );
    expect(screen.getByText('my error message')).toBeInTheDocument();
  });
});
