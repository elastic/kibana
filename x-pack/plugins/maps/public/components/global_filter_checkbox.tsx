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
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.filterEditor.applyGlobalFilterHelp', {
          defaultMessage: 'When enabled, results narrowed by global search',
        })}
      >
        <EuiSwitch
          label={label}
          checked={applyGlobalQuery}
          onChange={onApplyGlobalQueryChange}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
