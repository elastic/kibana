/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo } from 'react';

import { assertUnreachable } from '../../../../common/utility_types';
import { CallOutDismissButton } from './callout_dismiss_button';
import type { CallOutMessage, CallOutType } from './callout_types';

export interface CallOutProps {
  message: CallOutMessage;
  iconType?: string;
  dismissButtonText?: string;
  onDismiss?: (message: CallOutMessage) => void;
  showDismissButton?: boolean;
}

const CallOutComponent: FC<CallOutProps> = ({
  message,
  iconType,
  dismissButtonText,
  onDismiss,
  showDismissButton = true,
}) => {
  const { type, id, title, description } = message;
  const finalIconType = iconType ?? getDefaultIconType(type);

  return (
    <EuiCallOut
      color={type}
      title={title}
      iconType={finalIconType}
      data-test-subj={`callout-${id}`}
      data-test-messages={`[${id}]`}
    >
      {description}
      {showDismissButton && (
        <CallOutDismissButton message={message} text={dismissButtonText} onClick={onDismiss} />
      )}
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
      return 'warning';
    default:
      return assertUnreachable(type);
  }
};

export const CallOut = memo(CallOutComponent);
