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
  isFeatureEditorOpenForLayer?: boolean;
}

export function GlobalTimeCheckbox({
  applyGlobalTime,
  label,
  setApplyGlobalTime,
  isFeatureEditorOpenForLayer,
}: Props) {
  const onApplyGlobalTimeChange = (event: EuiSwitchEvent) => {
    setApplyGlobalTime(event.target.checked);
  };

  const tooltipMessage = isFeatureEditorOpenForLayer
    ? i18n.translate('xpack.maps.filterEditor.isGlobalTimeNotApplied', {
        defaultMessage: 'Global time is not applied to the layer while editing features',
      })
    : i18n.translate('xpack.maps.filterEditor.applyGlobalTimeHelp', {
        defaultMessage: 'When enabled, results narrowed by global time',
      });

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiToolTip position="top" content={tooltipMessage}>
        <EuiSwitch
          label={label}
          checked={isFeatureEditorOpenForLayer ? false : applyGlobalTime}
          onChange={onApplyGlobalTimeChange}
          data-test-subj="mapLayerPanelApplyGlobalTimeCheckbox"
          compressed
          disabled={isFeatureEditorOpenForLayer}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
