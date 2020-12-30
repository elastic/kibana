/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { EuiCallOut } from '@elastic/eui';

import { CallOutType, CallOutMessage } from './callout_types';
import { CallOutDescription } from './callout_description';
import { CallOutDismissButton } from './callout_dismiss_button';

export interface CallOutProps {
  message: CallOutMessage;
  iconType?: string;
  dismissButtonText?: string;
  onDismiss?: (message: CallOutMessage) => void;
}

const CallOutComponent: FC<CallOutProps> = ({
  message,
  iconType,
  dismissButtonText,
  onDismiss,
}) => {
  const { type, id, title } = message;
  const finalIconType = iconType ?? getDefaultIconType(type);

  return (
    <EuiCallOut
      color={type}
      title={title}
      iconType={finalIconType}
      data-test-subj={`callout-${id}`}
      data-test-messages={`[${id}]`}
    >
      <CallOutDescription messages={message} />
      <CallOutDismissButton message={message} text={dismissButtonText} onClick={onDismiss} />
    </EuiCallOut>
  );
};

const getDefaultIconType = (type: CallOutType): string => {
  switch (type) {
    case 'primary':
      return 'iInCircle';
    case 'success':
      return 'cheer';
    case 'warning':
      return 'help';
    case 'danger':
      return 'alert';
    default:
      return '';
  }
};

export const CallOut = memo(CallOutComponent);
