/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';

import { CallOutMessage } from './callout_types';
import { CallOut } from './callout';
import { useCallOutStorage } from './use_callout_storage';

export interface CallOutSwitcherProps {
  namespace?: string;
  condition: boolean;
  message: CallOutMessage;
}

const CallOutSwitcherComponent: FC<CallOutSwitcherProps> = ({ namespace, condition, message }) => {
  const { isVisible, dismiss } = useCallOutStorage([message], namespace);

  const shouldRender = condition && isVisible(message);
  return shouldRender ? <CallOut message={message} onDismiss={dismiss} /> : null;
};

export const CallOutSwitcher = memo(CallOutSwitcherComponent);
