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

import { Chat } from './chat';

export default {
  title: 'Chat Widget',
  description: '',
  parameters: {},
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

export const Component = () => {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <>
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
      <Chat onHide={() => setIsHidden(true)} />
    </>
  );
};
