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
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  PostMessageParams,
  SlackApiConfig,
  ValidChannelIdSubActionParams,
  ValidChannelResponse,
} from '../../../common/slack_api/types';

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
  const [connectorId, setConnectorId] = useState<string>();
  const { subAction, subActionParams } = actionParams;
  const { channels = [], text, channelIds = [] } = subActionParams ?? {};
  const [tempChannelId, setTempChannelId] = useState(
    channels.length > 0
      ? channels[0]
      : channelIds.length > 0 && channelIds[0].length > 0
      ? channelIds[0]
      : ''
  );
  const [validChannelId, setValidChannelId] = useState('');
  const { toasts } = useKibana().notifications;
  const allowedChannelsConfig =
    (actionConnector as UserConfiguredActionConnector<SlackApiConfig, unknown>)?.config
      ?.allowedChannels ?? [];
  const [selectedChannels, setSelectedChannels] = useState<EuiComboBoxOptionOption[]>(
    (channelIds ?? []).map((c) => {
      const allowedChannelSelected = allowedChannelsConfig?.find((ac) => ac.id === c);
      return {
        value: c,
        label: allowedChannelSelected
          ? `${allowedChannelSelected.id} - ${allowedChannelSelected.name}`
          : c,
      };
    })
  );
  const [channelValidError, setChannelValidError] = useState<string[]>([]);
  const {
    response: { channel: channelValidInfo } = {},
    isLoading: isValidatingChannel,
    error: channelValidErrorResp,
  } = useSubAction<ValidChannelIdSubActionParams, ValidChannelResponse>({
    connectorId: actionConnector?.id,
    subAction: 'validChannelId',
    subActionParams: {
      channelId: validChannelId,
    },
    disabled: validChannelId.length === 0 && allowedChannelsConfig.length === 0,
  });

  useEffect(() => {
    if (useDefaultMessage || !text) {
      editAction('subActionParams', { channels, channelIds, text: defaultMessage }, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage, useDefaultMessage]);

  useEffect(() => {
    if (
      !isValidatingChannel &&
      !channelValidErrorResp &&
      channelValidInfo &&
      validChannelId === channelValidInfo.id
    ) {
      editAction(
        'subActionParams',
        { channels: undefined, channelIds: [channelValidInfo.id], text },
        index
      );
      setValidChannelId('');
      setChannelValidError([]);
    }
  }, [
    channelValidInfo,
    validChannelId,
    channelValidErrorResp,
    isValidatingChannel,
    editAction,
    text,
    index,
  ]);

  useEffect(() => {
    if (channelValidErrorResp && validChannelId.length > 0) {
      editAction('subActionParams', { channels: undefined, channelIds: [], text }, index);
      const errorMessage = i18n.translate(
        'xpack.stackConnectors.slack.params.componentError.validChannelsRequestFailed',
        {
          defaultMessage: '{validChannelId} is not a valid Slack channel',
          values: {
            validChannelId,
          },
        }
      );
      setChannelValidError([errorMessage]);
      setValidChannelId('');
      toasts.danger({
        title: errorMessage,
        body: channelValidErrorResp.message,
      });
    }
  }, [toasts, channelValidErrorResp, validChannelId, editAction, text, index]);

  useEffect(() => {
    // Reset channel id input when we changes connector
    if (connectorId && connectorId !== actionConnector?.id) {
      editAction('subActionParams', { channels: undefined, channelIds: [], text }, index);
      setTempChannelId('');
      setValidChannelId('');
      setChannelValidError([]);
      setSelectedChannels([]);
    }
    setConnectorId(actionConnector?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector?.id]);

  if (!subAction) {
    editAction('subAction', 'postMessage', index);
  }
  if (!subActionParams) {
    editAction(
      'subActionParams',
      {
        channels,
        channelIds,
        text,
      },
      index
    );
  }
  const typeChannelInput = useMemo(() => {
    if (channels.length > 0 && channelIds.length === 0) {
      return 'channel-name';
    } else if (
      (
        (actionConnector as UserConfiguredActionConnector<SlackApiConfig, unknown>)?.config
          ?.allowedChannels ?? []
      ).length > 0
    ) {
      return 'channel-allowed-ids';
    }
    return 'channel-id';
  }, [actionConnector, channelIds.length, channels.length]);

  const slackChannelsOptions = useMemo(() => {
    return (
      (actionConnector as UserConfiguredActionConnector<SlackApiConfig, unknown>)?.config
        ?.allowedChannels ?? []
    ).map((ac) => ({
      label: `${ac.id} - ${ac.name}`,
      value: ac.id,
      'data-test-subj': ac.id,
    }));
  }, [actionConnector]);

  const onChangeComboBox = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const newSelectedChannels = newOptions.map<string>((option) => option.value!.toString());
      setSelectedChannels(newOptions);
      editAction(
        'subActionParams',
        { channels: undefined, channelIds: newSelectedChannels, text },
        index
      );
    },
    [editAction, index, text]
  );
  const onBlurChannelIds = useCallback(() => {
    if (tempChannelId === '') {
      editAction('subActionParams', { channels: undefined, channelIds: [], text }, index);
    }
    setValidChannelId(tempChannelId.trim());
  }, [editAction, index, tempChannelId, text]);

  const onChangeTextField = useCallback(
    (evt) => {
      editAction('subActionParams', { channels: undefined, channelIds: [], text }, index);
      setTempChannelId(evt.target.value);
    },
    [editAction, index, text]
  );

  const channelInput = useMemo(() => {
    if (typeChannelInput === 'channel-name' || typeChannelInput === 'channel-id') {
      return (
        <EuiFieldText
          data-test-subj="slackApiChannelId"
          name="slackApiChannelId"
          value={tempChannelId}
          isLoading={isValidatingChannel}
          onChange={onChangeTextField}
          onBlur={onBlurChannelIds}
          isInvalid={channelValidError.length > 0}
          fullWidth={true}
        />
      );
    }
    return (
      <EuiComboBox
        noSuggestions={false}
        data-test-subj="slackChannelsComboBox"
        options={slackChannelsOptions}
        selectedOptions={selectedChannels}
        onChange={onChangeComboBox}
        singleSelection={true}
        fullWidth={true}
      />
    );
  }, [
    channelValidError.length,
    isValidatingChannel,
    onBlurChannelIds,
    onChangeComboBox,
    onChangeTextField,
    selectedChannels,
    slackChannelsOptions,
    tempChannelId,
    typeChannelInput,
  ]);

  return (
    <>
      <EuiFormRow
        label={
          typeChannelInput === 'channel-name'
            ? i18n.translate('xpack.stackConnectors.slack.params.channelsComboBoxLabel', {
                defaultMessage: 'Channel',
              })
            : i18n.translate('xpack.stackConnectors.slack.params.channelIdComboBoxLabel', {
                defaultMessage: 'Channel ID',
              })
        }
        fullWidth
        error={channelValidError.length > 0 ? channelValidError : errors.channels}
        isInvalid={errors.channels?.length > 0 || channelValidError.length > 0}
        helpText={
          channelIds.length > 0 && channelValidInfo
            ? `${channelValidInfo.id} - ${channelValidInfo.name}`
            : ''
        }
      >
        {channelInput}
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        editAction={(key: string, value: any) =>
          editAction('subActionParams', { channels, channelIds, text: value }, index)
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
