/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiSpacer,
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { useSubAction } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SlackExecuteActionParams } from '../../../common/slack/types';
import type { GetChannelsResponse } from '../../../common/slack/types';

interface ChannelsStatus {
  label: string;
  checked?: 'on';
}

const SlackParamsFields: React.FunctionComponent<ActionParamsProps<SlackExecuteActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { subAction, subActionParams } = actionParams;
  const { channels, text } = (subActionParams as { text: string; channels: string[] }) ?? {}; // maybe should get rid of & {} in the type

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const {
    response: { channels: channelsInfo } = {},
    isLoading: isLoadingChannels,
    error: getChannelsError,
  } = useSubAction<void, GetChannelsResponse>({
    connectorId: actionConnector?.id,
    subAction: 'getChannels',
  });

  const slackChannels = useMemo(
    () =>
      channelsInfo
        ?.filter((slackChannel) => slackChannel.is_channel)
        .map((slackChannel) => ({ label: slackChannel.name })) ?? [],
    [channelsInfo]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      // isSelected={isPopoverOpen}
      numFilters={selectedChannels.length}
      hasActiveFilters={selectedChannels.length > 0}
      numActiveFilters={selectedChannels.length}
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.rulesList.ruleTagFilterButton"
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
      <EuiFilterGroup>
        <EuiPopover
          id={'id'}
          button={button}
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
        >
          <EuiSelectable
            searchable
            data-test-subj={'test-data'} // new name
            isLoading={isLoadingChannels}
            options={options}
            loadingMessage={'Loading channels'} // need translations
            noMatchesMessage={'No channels found'}
            emptyMessage={'No channels available'}
            // errorMessage={}
            onChange={onChange}
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
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        editAction={(key: string, value: any) =>
          editAction('subActionParams', { channels, text: value }, index)
        }
        messageVariables={messageVariables}
        paramsProperty={'text'}
        inputTargetValue={text}
        label={i18n.translate('xpack.stackConnectors.components.slack.messageTextAreaFieldLabel', {
          defaultMessage: 'Message',
        })}
        errors={(errors.message ?? []) as string[]}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
