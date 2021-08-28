/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';

import { AlertInstanceListItem } from './alert_instances';

interface ComponentOpts {
  alertInstance: AlertInstanceListItem;
  onMuteAction: (instance: AlertInstanceListItem) => Promise<void>;
  disabled: boolean;
}

export const RuleMutedSwitch: React.FunctionComponent<ComponentOpts> = ({
  alertInstance,
  onMuteAction,
  disabled,
}: ComponentOpts) => {
  const [isMuted, setIsMuted] = useState<boolean>(alertInstance?.isMuted);
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
        await onMuteAction(alertInstance);
        setIsMuted(!isMuted);
        setIsUpdating(false);
      }}
      data-test-subj={`muteAlertInstanceButton_${alertInstance.instance}`}
      showLabel={false}
      label="mute"
    />
  );
};
