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
import { EuiSpacer, EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { useSubAction, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import type { GetChannelsResponse, PostMessageParams } from '../../../common/slack_api/types';

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
  const { channels = [], text } = subActionParams ?? {};
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
    response: { channels: channelsInfo } = {},
    isLoading: isLoadingChannels,
    error: channelsError,
  } = useSubAction<void, GetChannelsResponse>({
    connectorId: actionConnector?.id,
    subAction: 'getChannels',
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
        .map((slackChannel) => ({ label: slackChannel.name })) ?? [],
    [channelsInfo]
  );

  const onChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const newSelectedChannels = newOptions.map((option) => option.label);

      setSelectedChannels(newOptions);
      editAction('subActionParams', { channels: newSelectedChannels, text }, index);
    },
    [editAction, index, text]
  );

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
        <EuiComboBox
          noSuggestions={false}
          data-test-subj="slackChannelsComboBox"
          isLoading={isLoadingChannels}
          options={slackChannels}
          selectedOptions={selectedChannels}
          onChange={onChange}
          singleSelection={true}
        />
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
