/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';

import { CallOutMessage } from './callout_types';
import { CallOut } from './callout';

export interface CallOutPersistentSwitcherProps {
  condition: boolean;
  message: CallOutMessage;
}

const CallOutPersistentSwitcherComponent: FC<CallOutPersistentSwitcherProps> = ({
  condition,
  message,
}): JSX.Element | null =>
  condition ? <CallOut message={message} showDismissButton={false} /> : null;

export const CallOutPersistentSwitcher = memo(CallOutPersistentSwitcherComponent);
