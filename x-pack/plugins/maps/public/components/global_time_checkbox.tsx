/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import React from 'react';

interface Props {
  applyGlobalTime: boolean;
  label: string;
  setApplyGlobalTime: (applyGlobalTime: boolean) => void;
}

export function GlobalTimeCheckbox({ applyGlobalTime, label, setApplyGlobalTime }: Props) {
  const onApplyGlobalTimeChange = (event: EuiSwitchEvent) => {
    setApplyGlobalTime(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiSwitch
        label={label}
        checked={applyGlobalTime}
        onChange={onApplyGlobalTimeChange}
        data-test-subj="mapLayerPanelApplyGlobalTimeCheckbox"
        compressed
      />
    </EuiFormRow>
  );
}
