/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiSwitch } from '@elastic/eui';

import * as i18n from '../../translations';

interface Props {
  disabled: boolean;
  isSynced?: boolean;
  showLabel?: boolean;
  onSwitchChange?: (isSynced: boolean) => void;
}

const SyncAlertsSwitchComponent: React.FC<Props> = ({
  disabled,
  isSynced = true,
  showLabel = false,
  onSwitchChange,
}) => {
  const [isOn, setIsOn] = useState(isSynced);

  const onChange = useCallback(() => {
    if (onSwitchChange) {
      onSwitchChange(!isOn);
    }

    setIsOn(!isOn);
  }, [isOn, onSwitchChange]);

  return (
    <EuiSwitch
      label={isOn ? i18n.SYNC_ALERTS_SWITCH_LABEL_ON : i18n.SYNC_ALERTS_SWITCH_LABEL_OFF}
      showLabel={showLabel}
      checked={isOn}
      onChange={onChange}
      disabled={disabled}
      data-test-subj="sync-alerts-switch"
    />
  );
};

SyncAlertsSwitchComponent.displayName = 'SyncAlertsSwitchComponent';

export const SyncAlertsSwitch = memo(SyncAlertsSwitchComponent);
