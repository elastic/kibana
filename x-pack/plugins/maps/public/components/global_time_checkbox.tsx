/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
interface Props {
  applyGlobalTime: boolean;
  label: string;
  setApplyGlobalTime: (applyGlobalTime: boolean) => void;
  disabledReason?: string;
}

export function GlobalTimeCheckbox({
  applyGlobalTime,
  label,
  setApplyGlobalTime,
  disabledReason,
}: Props) {
  const onApplyGlobalTimeChange = (event: EuiSwitchEvent) => {
    setApplyGlobalTime(event.target.checked);
  };

  const tooltipMessage = disabledReason
    ? disabledReason
    : i18n.translate('xpack.maps.filterEditor.applyGlobalTimeHelp', {
        defaultMessage: 'When on, results narrowed by global time',
      });

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiToolTip position="top" content={tooltipMessage}>
        <EuiSwitch
          label={label}
          checked={disabledReason ? false : applyGlobalTime}
          onChange={onApplyGlobalTimeChange}
          data-test-subj="mapLayerPanelApplyGlobalTimeCheckbox"
          compressed
          disabled={disabledReason !== undefined}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
