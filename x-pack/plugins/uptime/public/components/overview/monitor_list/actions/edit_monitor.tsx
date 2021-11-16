/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useState } from 'react';
import { MonitorConfigFlyout } from './monitor_config_flyout';
import { MonitorSavedObject } from '../../../../../common/types';
import { SyntheticsCreateProviders } from '../../../fleet_package/contexts';

interface Props {
  monitor: MonitorSavedObject;
}
export const EditMonitor = ({ monitor }: Props) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  const onEdit = async () => {
    showFlyout();
  };

  return (
    <>
      <EuiButtonIcon iconType="documentEdit" onClick={() => onEdit()} />
      {isFlyoutVisible && (
        <SyntheticsCreateProviders>
          <MonitorConfigFlyout setIsFlyoutVisible={setIsFlyoutVisible} monitor={monitor} />
        </SyntheticsCreateProviders>
      )}
    </>
  );
};
