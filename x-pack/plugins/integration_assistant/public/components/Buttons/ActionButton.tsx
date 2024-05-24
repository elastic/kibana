/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { MouseEventHandler } from 'react';

interface ActionButtonProps {
  text: string;
  onActionClick: MouseEventHandler;
  isLoading?: boolean;
  isDisabled?: boolean;
}

export const ActionButton = ({
  text,
  onActionClick,
  isLoading = false,
  isDisabled = false,
}: ActionButtonProps) => {
  return (
    <EuiButton
      fill
      isDisabled={isDisabled}
      isLoading={isLoading}
      aria-label="action-button"
      onClick={onActionClick}
    >
      {text}
    </EuiButton>
  );
};
