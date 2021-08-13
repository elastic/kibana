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
  setApplyGlobalQuery: (applyGlobalQuery: boolean) => void;
}

export function GlobalFilterCheckbox({ applyGlobalQuery, setApplyGlobalQuery }: Props) {
  const onApplyGlobalQueryChange = (event: EuiSwitchEvent) => {
    setApplyGlobalQuery(event.target.checked);
  };

  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.filterEditor.applyGlobalFilterHelp', {
          defaultMessage:
            'Whether the query and filters from the global query bar should be applied to the layer.',
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.maps.filterEditor.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply global filter to layer data`,
          })}
          checked={applyGlobalQuery}
          onChange={onApplyGlobalQueryChange}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
        />
      </EuiToolTip>
    </EuiFormRow>
  );
}
