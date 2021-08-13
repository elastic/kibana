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
  setApplyGlobalTime: (applyGlobalTime: boolean) => void;
}

export function GlobalTimeCheckbox({ applyGlobalTime, setApplyGlobalTime }: Props) {
  const onApplyGlobalTimeChange = (event: EuiSwitchEvent) => {
    setApplyGlobalTime(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.filterEditor.applyGlobalTimeHelp', {
          defaultMessage:
            'Whether the time selection from the global query bar should be applied to the layer.',
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.maps.filterEditor.applyGlobalTimeCheckboxLabel', {
            defaultMessage: `Apply global time to layer data`,
          })}
          checked={applyGlobalTime}
          onChange={onApplyGlobalTimeChange}
          data-test-subj="mapLayerPanelApplyGlobalTimeCheckbox"
          compressed
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
