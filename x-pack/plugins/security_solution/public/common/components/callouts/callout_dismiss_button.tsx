/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { noop } from 'lodash/fp';
import { CallOutMessage } from './callout_types';
import * as i18n from './translations';

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
  const { type } = message;
  const buttonColor = type;
  const buttonText = text ?? i18n.DISMISS_BUTTON;
  const handleClick = useCallback(() => onClick(message), [onClick, message]);

  return (
    <EuiButton color={buttonColor} data-test-subj="callout-dismiss-btn" onClick={handleClick}>
      {buttonText}
    </EuiButton>
  );
};
