/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiSpacer,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
} from '@elastic/eui';
import { useSubAction, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { debounce } from 'lodash';
import type {
  GetAllowedChannelsResponse,
  PostMessageParams,
  ValidChannelIdSubActionParams,
  ValidChannelResponse,
} from '../../../common/slack_api/types';

/** wait this many ms after the user completes typing before applying the filter input */
const INPUT_TIMEOUT = 250;

const SlackParamsFields: React.FunctionComponent<ActionParamsProps<PostMessageParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
  useDefaultMessage,
}) => {
  const { subAction, subActionParams } = actionParams;
  const { channels = [], text, channelId = '' } = subActionParams ?? {};
  const [validChannelId, setValidChannelId] = useState('');
  const { toasts } = useKibana().notifications;

  useEffect(() => {
    if (useDefaultMessage || !text) {
      editAction('subActionParams', { channels, text: defaultMessage }, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage, useDefaultMessage]);

  if (!subAction) {
    editAction('subAction', 'postMessage', index);
  }
  if (!subActionParams) {
    editAction(
      'subActionParams',
      {
        channels,
        text,
      },
      index
    );
  }

  const {
    response: { channels: channelsInfo = [] } = {},
    isLoading: isLoadingChannels,
    error: channelsError,
  } = useSubAction<void, GetAllowedChannelsResponse>({
    connectorId: actionConnector?.id,
    subAction: 'getAllowedChannels',
  });

  const {
    response: { channel: channelValidInfo } = {},
    isLoading: isValidatingChannel,
    error: channelValidError,
  } = useSubAction<ValidChannelIdSubActionParams, ValidChannelResponse>({
    connectorId: actionConnector?.id,
    subAction: 'validChannelId',
    subActionParams: {
      channelId: validChannelId,
    },
    disabled: validChannelId.length === 0,
  });

  useEffect(() => {
    if (channelsError) {
      toasts.danger({
        title: i18n.translate(
          'xpack.stackConnectors.slack.params.componentError.getChannelsRequestFailed',
          {
            defaultMessage: 'Failed to retrieve Slack channels list',
          }
        ),
        body: channelsError.message,
      });
    }
  }, [toasts, channelsError]);

  const [selectedChannels, setSelectedChannels] = useState<EuiComboBoxOptionOption[]>(
    (channels ?? []).map((c) => ({ label: c }))
  );

  const slackChannels = useMemo(
    () =>
      channelsInfo
        ?.filter((slackChannel) => slackChannel.is_channel)
        .map((slackChannel) => ({
          label: `${slackChannel.id} - ${slackChannel.name}`,
          value: slackChannel.id,
        })) ?? [],
    [channelsInfo]
  );

  const typeChannelInput = useMemo(() => {
    if (channels.length > 0 && channelId.length === 0) {
      return 'channel-name';
    } else if (channelsInfo.length > 0) {
      return 'channel-allowed-id';
    }
    return 'channel-id';
  }, [channelId.length, channels.length, channelsInfo.length]);

  const onChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const newSelectedChannels = newOptions.map((option) => option.label);

      setSelectedChannels(newOptions);
      editAction('subActionParams', { channels: newSelectedChannels, text }, index);
    },
    [editAction, index, text]
  );
  const debounceSetToken = debounce((validThisChannelId: string) => {
    setValidChannelId(validThisChannelId);
  }, INPUT_TIMEOUT);

  const ChannelInput = useCallback(() => {
    if (typeChannelInput === 'channel-name') {
      return (
        <EuiFieldText
          data-test-subj="slackApiChannelName"
          name="slackApiChannelName"
          value={channels[0]}
          onChange={(e) => {
            editAction('subActionParams', { channels: [e.target.value], text }, index);
          }}
          isInvalid={false}
          fullWidth={true}
        />
      );
    } else if (typeChannelInput === 'channel-id') {
      // TO DO validate
      return (
        <EuiFieldText
          data-test-subj="slackApiChannelId"
          name="slackApiChannelId"
          value={channelId}
          isLoading={isValidatingChannel}
          onChange={(e) => {
            debounceSetToken(e.target.value);
            editAction(
              'subActionParams',
              { channels: undefined, channelId: e.target.value, text },
              index
            );
          }}
          isInvalid={false}
          fullWidth={true}
        />
      );
    } else if (typeChannelInput === 'channel-allowed-id') {
      return (
        <EuiComboBox
          noSuggestions={false}
          data-test-subj="slackChannelsComboBox"
          isLoading={isLoadingChannels}
          options={slackChannels}
          selectedOptions={selectedChannels}
          onChange={onChange}
          singleSelection={true}
        />
      );
    }
    return null;
  }, [
    channelId,
    channels,
    debounceSetToken,
    editAction,
    index,
    isLoadingChannels,
    isValidatingChannel,
    onChange,
    selectedChannels,
    slackChannels,
    text,
    typeChannelInput,
  ]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.stackConnectors.slack.params.channelsComboBoxLabel', {
          defaultMessage: 'Channels',
        })}
        fullWidth
        error={errors.channels}
        isInvalid={errors.channels?.length > 0 && channels.length === 0}
      >
        <ChannelInput />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        editAction={(key: string, value: any) =>
          editAction('subActionParams', { channels, text: value }, index)
        }
        messageVariables={messageVariables}
        paramsProperty="webApi"
        inputTargetValue={text}
        label={i18n.translate('xpack.stackConnectors.components.slack.messageTextAreaFieldLabel', {
          defaultMessage: 'Message',
        })}
        errors={(errors.text ?? []) as string[]}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
