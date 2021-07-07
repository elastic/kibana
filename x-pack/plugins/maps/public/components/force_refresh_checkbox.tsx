/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

interface Props {
  respondToForceRefresh: boolean;
  label: string;
  setRespondToForceRefresh: (applyGlobalTime: boolean) => void;
}

export function ForceRefreshCheckbox({
  respondToForceRefresh,
  label,
  setRespondToForceRefresh,
}: Props) {
  const onRespondRoForceRefreshChange = (event: EuiSwitchEvent) => {
    setRespondToForceRefresh(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiSwitch
        label={label}
        checked={respondToForceRefresh}
        onChange={onRespondRoForceRefreshChange}
        data-test-subj="mapLayerPanelRespondToForceRefreshCheckbox"
        compressed
      />
    </EuiFormRow>
  );
}
