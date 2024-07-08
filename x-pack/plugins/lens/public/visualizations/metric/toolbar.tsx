/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover } from '../../shared_components';
import { MetricVisualizationState } from './visualization';

export function Toolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const { state, setState } = props;

  const setSubtitle = useCallback(
    (prefix: string) => setState({ ...state, subtitle: prefix }),
    [setState, state]
  );

  const { inputValue: subtitleInputVal, handleInputChange: handleSubtitleChange } =
    useDebouncedValue<string>(
      {
        onChange: setSubtitle,
        value: state.subtitle || '',
      },
      { allowFalsyValue: true }
    );

  const hasBreakdownBy = Boolean(state.breakdownByAccessor);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
      {!hasBreakdownBy && (
        <ToolbarPopover
          title={i18n.translate('xpack.lens.metric.labels', {
            defaultMessage: 'Labels',
          })}
          type="labels"
          groupPosition="none"
          buttonDataTestSubj="lnsLabelsButton"
        >
          <EuiFormRow
            label={i18n.translate('xpack.lens.metric.subtitleLabel', {
              defaultMessage: 'Subtitle',
            })}
            fullWidth
            display="columnCompressed"
          >
            <EuiFieldText
              value={subtitleInputVal}
              onChange={({ target: { value } }) => handleSubtitleChange(value)}
            />
          </EuiFormRow>
        </ToolbarPopover>
      )}
    </EuiFlexGroup>
  );
}
