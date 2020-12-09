/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { CallOutMessage } from './callout_types';

export interface CallOutDismissButtonProps {
  message: CallOutMessage;
  text?: string;
  onClick?: (message: CallOutMessage) => void;
}

export const CallOutDismissButton: FC<CallOutDismissButtonProps> = ({
  message,
  text,
  onClick = noop,
}) => {
  const { type, id } = message;
  const buttonColor = type === 'success' ? 'secondary' : type;
  const buttonText = text ?? 'Dismiss'; // TODO: i18n
  const handleClick = useCallback(() => onClick(message), [onClick, message]);

  return (
    <EuiButton data-test-subj={`callout-dismiss-[${id}]`} color={buttonColor} onClick={handleClick}>
      {buttonText}
    </EuiButton>
  );
};
