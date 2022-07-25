/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiFieldText, EuiToolTip } from '@elastic/eui';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover, useDebouncedValue } from '../../shared_components';
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
      <ToolbarPopover
        title={i18n.translate('xpack.lens.metric.labels', {
          defaultMessage: 'Labels',
        })}
        type="labels"
        groupPosition="left"
        buttonDataTestSubj="lnsLabelsButton"
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.subtitleLabel', {
            defaultMessage: 'Subtitle',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiToolTip
            position="right"
            content={
              hasBreakdownBy ? (
                <p>
                  {i18n.translate('xpack.lens.metric.subtitleNotVisible', {
                    defaultMessage:
                      'The subtitle is not visible since a "break down by" dimension is in use.',
                  })}
                </p>
              ) : null
            }
            display="block"
          >
            <EuiFieldText
              disabled={hasBreakdownBy}
              value={subtitleInputVal}
              onChange={({ target: { value } }) => handleSubtitleChange(value)}
            />
          </EuiToolTip>
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
