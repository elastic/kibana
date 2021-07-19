/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';

interface Props {
  applyGlobalQuery: boolean;
  label: string;
  setApplyGlobalQuery: (applyGlobalQuery: boolean) => void;
}

export function GlobalFilterCheckbox({ applyGlobalQuery, label, setApplyGlobalQuery }: Props) {
  const onApplyGlobalQueryChange = (event: EuiSwitchEvent) => {
    setApplyGlobalQuery(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiSwitch
        label={label}
        checked={applyGlobalQuery}
        onChange={onApplyGlobalQueryChange}
        data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
        compressed
      />
    </EuiFormRow>
  );
}
