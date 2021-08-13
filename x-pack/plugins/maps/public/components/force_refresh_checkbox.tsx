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
  respondToForceRefresh: boolean;
  setRespondToForceRefresh: (applyGlobalTime: boolean) => void;
  isDisabled: boolean;
}

export function ForceRefreshCheckbox({
  respondToForceRefresh,
  setRespondToForceRefresh,
  isDisabled,
}: Props) {
  const onRespondRoForceRefreshChange = (event: EuiSwitchEvent) => {
    setRespondToForceRefresh(event.target.checked);
  };

  const tooltipContent = isDisabled
    ? i18n.translate('xpack.maps.filterEditor.respondToForceRefreshDefaultHelp', {
        defaultMessage: `Turn this flag off for when the underlying data is static, and does not need to be refreshed based on time.`,
      })
    : i18n.translate('xpack.maps.filterEditor.respondToForceRefreshDisabledHelp', {
        defaultMessage: `This layer will not respond to any changes in the global query state.`,
      });

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiToolTip position="top" content={tooltipContent}>
        <EuiSwitch
          label={i18n.translate('xpack.maps.filterEditor.respondToForceRefreshLabel', {
            defaultMessage: `Refresh layer on global refresh`,
          })}
          checked={respondToForceRefresh}
          onChange={onRespondRoForceRefreshChange}
          data-test-subj="mapLayerPanelRespondToForceRefreshCheckbox"
          compressed
          disabled={isDisabled}
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
