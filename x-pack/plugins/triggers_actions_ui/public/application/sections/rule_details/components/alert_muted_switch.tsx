/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';

import { AlertListItem } from './rule';

interface ComponentOpts {
  alert: AlertListItem;
  onMuteAction: (instance: AlertListItem) => Promise<void>;
  disabled: boolean;
}

export const AlertMutedSwitch: React.FunctionComponent<ComponentOpts> = ({
  alert,
  onMuteAction,
  disabled,
}: ComponentOpts) => {
  const [isMuted, setIsMuted] = useState<boolean>(alert?.isMuted);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  return isUpdating ? (
    <EuiLoadingSpinner size="m" />
  ) : (
    <EuiSwitch
      name="mute"
      disabled={disabled}
      compressed={true}
      checked={isMuted}
      onChange={async () => {
        setIsUpdating(true);
        await onMuteAction(alert);
        setIsMuted(!isMuted);
        setIsUpdating(false);
      }}
      data-test-subj={`muteAlertButton_${alert.alert}`}
      showLabel={false}
      label="mute"
    />
  );
};
