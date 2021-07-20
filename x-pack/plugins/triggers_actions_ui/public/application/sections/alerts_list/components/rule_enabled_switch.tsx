/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncScheduler } from 'rxjs';
import React, { useEffect, useState } from 'react';
import { EuiSwitch } from '@elastic/eui';

import { Alert, AlertTableItem } from '../../../../types';

interface ComponentOpts {
  item: AlertTableItem;
  onAlertChanged: () => void;
  enableAlert: (alert: Alert) => Promise<void>;
  disableAlert: (alert: Alert) => Promise<void>;
}

export const RuleEnabledSwitch: React.FunctionComponent<ComponentOpts> = ({
  item,
  onAlertChanged,
  disableAlert,
  enableAlert,
}: ComponentOpts) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(!item.enabled);
  useEffect(() => {
    setIsEnabled(item.enabled);
  }, [item.enabled]);

  return (
    <EuiSwitch
      name="enable"
      disabled={!item.isEditable || !item.enabledInLicense}
      compressed
      checked={isEnabled}
      data-test-subj="enableSwitch"
      onChange={async () => {
        const enabled = isEnabled;
        asyncScheduler.schedule(async () => {
          if (enabled) {
            await disableAlert({ ...item, enabled });
          } else {
            await enableAlert({ ...item, enabled });
          }
          onAlertChanged();
        }, 10);
        setIsEnabled(!isEnabled);
      }}
      label=""
    />
  );
};
