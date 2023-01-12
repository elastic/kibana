/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiSuperSelect, EuiHealth } from '@elastic/eui';
import { SlackActionParams } from './types';

const SlackParamsFields: React.FunctionComponent<
  ActionParamsProps<SlackActionParams['subActionParams']>
> = ({ actionParams, editAction, index, errors, messageVariables, defaultMessage }) => {
  console.log('1', actionParams);
  console.log('2', editAction);
  console.log('3', index);
  console.log('4', errors);
  const { channel, text } = actionParams;
  const [[isUsingDefault, defaultMessageUsed], setDefaultMessageUsage] = useState<
    [boolean, string | undefined]
  >([false, defaultMessage]);
  useEffect(() => {
    if (
      !text ||
      (isUsingDefault && text === defaultMessageUsed && defaultMessageUsed !== defaultMessage)
    ) {
      setDefaultMessageUsage([true, defaultMessage]);
      editAction('message', defaultMessage, index); // ????
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage]);

  useEffect(() => {
    // const app = new App({
    //   token: process.env.SLACK_BOT_TOKEN,
    //   signingSecret: process.env.SLACK_SIGNING_SECRET
    // });
    // const func = async () => {
    //   const resp = await axios.post('https://slack.com/api/admin.usergroups.listChannels', {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Authorization: 'Bearer ',
    //       // ...(clusterUuid ? { 'X-Elastic-Cluster-ID': clusterUuid } : undefined),
    //       // 'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.16.0',
    //     },
    //     timeout: 5000,
    //   });
    //   return resp;
    // };
    // func();
  });

  const slackChannels = [
    {
      value: 'channel1',
      inputDisplay: (
        <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
          Channel1
        </EuiHealth>
      ),
    },
    {
      value: 'channel2',
      inputDisplay: (
        <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
          Channel2
        </EuiHealth>
      ),
    },
    {
      value: 'channel3',
      inputDisplay: (
        <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
          Channel3
        </EuiHealth>
      ),
    },
  ];

  const [selectedSlackChannel, setSelectedSlackChannel] = useState(slackChannels[1].value);

  return (
    <>
      <EuiSuperSelect
        options={slackChannels}
        valueOfSelected={selectedSlackChannel}
        onChange={(value) => value}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editAction}
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
