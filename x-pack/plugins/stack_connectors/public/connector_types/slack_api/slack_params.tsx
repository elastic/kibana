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
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiSelectableOption,
  EuiFormRow,
} from '@elastic/eui';
import { useSubAction, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GetChannelsResponse, PostMessageParams } from '../../../common/slack_api/types';

interface ChannelsStatus {
  label: string;
  checked?: 'on';
}

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

  const slackChannels = useMemo(
    () =>
      channelsInfo
        ?.filter((slackChannel) => slackChannel.is_channel)
        .map((slackChannel) => ({ label: slackChannel.name })) ?? [],
    [channelsInfo]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(channels ?? []);

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      numFilters={selectedChannels.length}
      hasActiveFilters={selectedChannels.length > 0}
      numActiveFilters={selectedChannels.length}
      data-test-subj="slackChannelsButton"
    >
      <FormattedMessage
        id="xpack.stackConnectors.slack.params..showChannelsListButton"
        defaultMessage="Channels"
      />
    </EuiFilterButton>
  );

  const options: ChannelsStatus[] = useMemo(
    () =>
      slackChannels.map((slackChannel) => ({
        label: slackChannel.label,
        ...(selectedChannels.includes(slackChannel.label) ? { checked: 'on' } : {}),
      })),
    [slackChannels, selectedChannels]
  );

  const onChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedChannels = newOptions.reduce<string[]>((result, option) => {
        if (option.checked === 'on') {
          result = [...result, option.label];
        }
        return result;
      }, []);

      setSelectedChannels(newSelectedChannels);
      editAction('subActionParams', { channels: newSelectedChannels, text }, index);
    },
    [editAction, index, text]
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.channels}
        isInvalid={errors.channels?.length > 0 && channels.length === 0}
      >
        <EuiFilterGroup>
          <EuiPopover
            id={'slackChannelsPopover'}
            button={button}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <EuiSelectable
              searchable
              data-test-subj="slackChannelsSelectableList"
              isLoading={isLoadingChannels}
              options={options}
              loadingMessage={i18n.translate(
                'xpack.stackConnectors.components.slack.loadingMessage',
                {
                  defaultMessage: 'Loading channels',
                }
              )}
              noMatchesMessage={i18n.translate(
                'xpack.stackConnectors.components.slack.noChannelsFound',
                {
                  defaultMessage: 'No channels found',
                }
              )}
              emptyMessage={i18n.translate(
                'xpack.stackConnectors.components.slack.noChannelsAvailable',
                {
                  defaultMessage: 'No channels available',
                }
              )}
              onChange={onChange}
              singleSelection={true}
            >
              {(list, search) => (
                <>
                  {search}
                  <EuiSpacer size="xs" />
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
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
