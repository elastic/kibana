/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiGlobalToastList,
  EuiGlobalToastListProps,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { forceReRender } from '@storybook/react';

import { Chat } from './chat_floating_bubble';
import { ServicesProvider } from '../../services';

export default {
  title: 'Chat Widget',
  description:
    'A Chat widget, enabled in Cloud, that allows a person to talk to Elastic about their deployment',
};

const Toaster = () => {
  const [toasts, setToasts] = useState<EuiGlobalToastListProps['toasts']>([]);

  return (
    <>
      <EuiButton
        onClick={() =>
          setToasts([
            {
              id: 'toast',
              title: 'Download complete!',
              color: 'success',
              text: <p>Thanks for your patience!</p>,
            },
          ])
        }
      >
        Show Toast
      </EuiButton>
      <EuiGlobalToastList
        toasts={toasts}
        toastLifeTimeMs={3000}
        dismissToast={() => {
          setToasts([]);
        }}
      />
    </>
  );
};

interface Params {
  id: string;
  email: string;
  chatURL: string;
  jwt: string;
  trialEndDate: string;
  kbnVersion: string;
  kbnBuildNum: number;
}

export const Component = ({
  id,
  email,
  chatURL,
  jwt,
  kbnVersion,
  trialEndDate,
  kbnBuildNum,
}: Params) => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <ServicesProvider
      chat={{
        chatURL,
        chatVariant: 'bubble',
        user: {
          jwt,
          id,
          email,
          trialEndDate: new Date(trialEndDate),
          kbnVersion,
          kbnBuildNum,
        },
      }}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <Toaster />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              setIsHidden(false);
              forceReRender();
            }}
            disabled={!isHidden}
          >
            Reset
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isHidden ? null : <Chat onHide={() => setIsHidden(true)} />}
    </ServicesProvider>
  );
};

Component.args = {
  id: '1234567890',
  email: 'email.address@elastic.co',
  chatURL: 'https://elasticcloud-production-chat-us-east-1.s3.amazonaws.com/drift-iframe.html',
  jwt: 'abcdefghijklmnopqrstuvwxyz',
  trialEndDate: new Date().toISOString(),
  kbnVersion: '8.9.0',
  kbnBuildNum: 12345,
};
