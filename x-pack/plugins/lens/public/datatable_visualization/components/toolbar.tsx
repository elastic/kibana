/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { ToolbarPopover } from '../../shared_components';
import { VisualizationToolbarProps } from '../../types';
import { DatatableVisualizationState } from '../visualization';

export function DataTableToolbar(props: VisualizationToolbarProps<DatatableVisualizationState>) {
  const { state, setState } = props;

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" responsive={false}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.table.valuesSettings', {
          defaultMessage: 'Settings',
        })}
        type="legend"
        groupPosition="none"
        buttonDataTestSubj="lnsSettingsButton"
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.table.settingFitRowToContentLabel', {
            defaultMessage: 'Fit row to content',
          })}
          display="columnCompressedSwitch"
        >
          <EuiSwitch
            compressed
            data-test-subj="lens-legend-auto-height-switch"
            label=""
            showLabel={false}
            checked={!!state.fitRowToContent}
            onChange={() => {
              const current = state.fitRowToContent ?? true;
              setState({
                ...state,
                fitRowToContent: !current,
              });
            }}
          />
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
