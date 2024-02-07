/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SlackParamsFields from './slack_params';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import userEvent from '@testing-library/user-event';

interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';

const mockUseValidChanelId = jest.fn().mockImplementation(() => ({
  isLoading: false,
  response: {
    channel: {
      id: 'id',
      name: 'general',
      is_channel: true,
      is_archived: false,
      is_private: true,
    },
  },
  error: null,
}));
const testBlock = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Hello, Assistant to the Regional Manager Dwight! *Michael Scott* wants to know where you'd like to take the Paper Company investors to dinner tonight.\n",
      },
    },
  ],
};
const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>(mockUseValidChanelId);

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
  beforeEach(() => {
    mockUseSubAction.mockClear();
    mockUseValidChanelId.mockClear();
    mockUseValidChanelId.mockImplementation(() => ({
      isLoading: false,
      response: {
        channel: {
          id: 'id',
          name: 'general',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      error: null,
    }));
  });
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
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');
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
      { channels: ['general'], channelIds: [], text: 'some different default message' },
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
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');

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

  test('default to text field when no existing subaction params', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionParams={{}}
          errors={{ message: [] }}
          editAction={() => {}}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('');
  });

  test('correctly renders params fields for postMessage subaction', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionConnector={
            {
              id: 'connector-id',
              actionTypeId: '.slack_api',
              config: {},
            } as ActionConnector
          }
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

    expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toBeInTheDocument();
    expect(screen.getByTestId('webApiTextTextArea')).toHaveValue('some text');
  });

  test('correctly renders params fields for postBlockkit subaction', async () => {
    render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionConnector={
            {
              id: 'connector-id',
              actionTypeId: '.slack_api',
              config: {},
            } as ActionConnector
          }
          actionParams={{
            subAction: 'postBlockkit',
            subActionParams: { channels: ['general'], text: JSON.stringify(testBlock) },
          }}
          errors={{ message: [] }}
          editAction={() => {}}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('slackMessageTypeChangeButton')).toBeInTheDocument();
    expect(screen.getByTestId('webApiBlock')).toBeInTheDocument();
  });

  test('should toggle subaction when button group clicked', async () => {
    const mockEditFunc = jest.fn();
    const { getByTestId } = render(
      <IntlProvider locale="en">
        <SlackParamsFields
          actionConnector={
            {
              id: 'connector-id',
              actionTypeId: '.slack_api',
              config: {},
            } as ActionConnector
          }
          actionParams={{
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          }}
          errors={{ message: [] }}
          editAction={mockEditFunc}
          index={0}
          defaultMessage="default message"
          messageVariables={[]}
        />
      </IntlProvider>
    );

    getByTestId('blockkit').click();
    expect(mockEditFunc).toBeCalledWith('subAction', 'postBlockkit', 0);

    getByTestId('text').click();
    expect(mockEditFunc).toBeCalledWith('subAction', 'postMessage', 0);
  });

  test('show the Channel label when using the old attribute "channels" in subActionParams', async () => {
    const mockEditFunc = jest.fn();
    const WrappedComponent = () => {
      return (
        <IntlProvider locale="en">
          <SlackParamsFields
            actionParams={{
              subAction: 'postMessage',
              subActionParams: { channels: ['old channel name'], text: 'some text' },
            }}
            actionConnector={
              {
                id: 'connector-id',
                config: {},
              } as ActionConnector
            }
            errors={{ message: [] }}
            editAction={mockEditFunc}
            index={0}
            defaultMessage="default message"
            messageVariables={[]}
          />
        </IntlProvider>
      );
    };
    const { getByTestId } = render(<WrappedComponent />);

    expect(screen.findByText('Channel')).toBeTruthy();
    expect(screen.getByTestId('slackApiChannelId')).toBeInTheDocument();
    expect(getByTestId('slackApiChannelId')).toHaveValue('old channel name');
  });

  test('show the Channel ID label when using the new attribute "channelIds" in subActionParams', async () => {
    const mockEditFunc = jest.fn();
    const WrappedComponent: React.FunctionComponent = () => {
      return (
        <IntlProvider locale="en">
          <SlackParamsFields
            actionParams={{
              subAction: 'postMessage',
              subActionParams: { channelIds: ['channel-id-xxx'], text: 'some text' },
            }}
            actionConnector={
              {
                id: 'connector-id',
                config: {},
              } as ActionConnector
            }
            errors={{ message: [] }}
            editAction={mockEditFunc}
            index={0}
            defaultMessage="default message"
            messageVariables={[]}
          />
        </IntlProvider>
      );
    };
    const { getByTestId } = render(<WrappedComponent />);

    expect(screen.findByText('Channel ID')).toBeTruthy();
    expect(screen.getByTestId('slackApiChannelId')).toBeInTheDocument();
    expect(getByTestId('slackApiChannelId')).toHaveValue('channel-id-xxx');
  });

  test('channel id in subActionParams should be validated', async () => {
    const mockEditFunc = jest.fn();
    mockUseValidChanelId.mockImplementation(() => ({
      isLoading: false,
      response: {
        channel: {
          id: 'new-channel-id',
          name: 'new channel id',
          is_channel: true,
          is_archived: false,
          is_private: true,
        },
      },
      error: null,
    }));
    const WrappedComponent = () => {
      return (
        <IntlProvider locale="en">
          <SlackParamsFields
            actionParams={{
              subAction: 'postMessage',
              subActionParams: { channelIds: ['new-channel-id'], text: 'some text' },
            }}
            actionConnector={
              {
                id: 'connector-id',
                config: {},
              } as ActionConnector
            }
            errors={{ message: [] }}
            editAction={mockEditFunc}
            index={0}
            defaultMessage="default message"
            messageVariables={[]}
          />
        </IntlProvider>
      );
    };
    const { getByTestId } = render(<WrappedComponent />);

    act(() => {
      getByTestId('slackApiChannelId').click();
      userEvent.clear(getByTestId('slackApiChannelId'));
      fireEvent.change(getByTestId('slackApiChannelId'), {
        target: { value: 'new-channel-id' },
      });
      userEvent.tab();
    });

    await waitFor(() => {
      expect(mockEditFunc).toBeCalledWith(
        'subActionParams',
        { channelIds: ['new-channel-id'], channels: undefined, text: 'some text' },
        0
      );
      expect(mockUseSubAction).toBeCalledWith({
        connectorId: 'connector-id',
        disabled: false,
        subAction: 'validChannelId',
        subActionParams: {
          channelId: 'new-channel-id',
        },
      });
    });
  });

  test('channel id work with combobox when allowedChannels pass in the config attributes', async () => {
    const mockEditFunc = jest.fn();
    const WrappedComponent = () => {
      return (
        <IntlProvider locale="en">
          <SlackParamsFields
            actionParams={{
              subAction: 'postMessage',
              subActionParams: { channelIds: ['channel-id-1'], text: 'some text' },
            }}
            actionConnector={
              {
                id: 'connector-id',
                config: {
                  allowedChannels: [
                    {
                      id: 'channel-id-1',
                      name: 'channel 1',
                    },
                    {
                      id: 'channel-id-2',
                      name: 'channel 2',
                    },
                    {
                      id: 'channel-id-3',
                      name: 'channel 3',
                    },
                  ],
                },
              } as unknown as ActionConnector
            }
            errors={{ message: [] }}
            editAction={mockEditFunc}
            index={0}
            defaultMessage="default message"
            messageVariables={[]}
          />
        </IntlProvider>
      );
    };
    const { getByTestId } = render(<WrappedComponent />);

    expect(screen.findByText('Channel ID')).toBeTruthy();
    expect(getByTestId('slackChannelsComboBox')).toBeInTheDocument();
    expect(getByTestId('slackChannelsComboBox').textContent).toBe('channel-id-1 - channel 1');

    act(() => {
      const combobox = getByTestId('slackChannelsComboBox');
      const inputCombobox = within(combobox).getByTestId('comboBoxSearchInput');
      inputCombobox.click();
    });

    await waitFor(() => {
      // const popOverElement = within(baseElement).getByTestId('slackChannelsComboBox-optionsList');
      expect(screen.getByTestId('channel-id-1')).toBeInTheDocument();
      expect(screen.getByTestId('channel-id-2')).toBeInTheDocument();
      expect(screen.getByTestId('channel-id-3')).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId('channel-id-3').click();
    });

    await waitFor(() => {
      expect(
        within(getByTestId('slackChannelsComboBox')).getByText('channel-id-3 - channel 3')
      ).toBeInTheDocument();
      expect(mockEditFunc).toBeCalledWith(
        'subActionParams',
        { channelIds: ['channel-id-3'], channels: undefined, text: 'some text' },
        0
      );
      expect(mockUseSubAction).toBeCalledWith({
        connectorId: 'connector-id',
        disabled: false,
        subAction: 'validChannelId',
        subActionParams: { channelId: '' },
      });
    });
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
