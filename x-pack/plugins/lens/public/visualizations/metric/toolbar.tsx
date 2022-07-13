/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFormRow, EuiFieldText, EuiToolTip } from '@elastic/eui';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover } from '../../shared_components';
import { MetricVisualizationState } from './visualization';

export function MetricToolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const { state, setState } = props;

  const hasSecondaryMetric = Boolean(state.secondaryMetricAccessor);
  const hasBreakdownBy = Boolean(state.breakdownByAccessor);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
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
          <EuiToolTip
            position="right"
            content={
              hasBreakdownBy ? (
                <p>The subtitle is not visible since a break down by dimension is in use.</p>
              ) : null
            }
            display="block"
          >
            <EuiFieldText
              disabled={hasBreakdownBy}
              value={state.subtitle}
              onChange={(event) =>
                setState({
                  ...state,
                  subtitle: event.target.value,
                })
              }
            />
          </EuiToolTip>
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.extraTextLabel', {
            defaultMessage: 'Extra text',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiToolTip
            position="right"
            content={
              hasSecondaryMetric ? (
                <p>The extra text is not visible since a secondary metric is selected.</p>
              ) : null
            }
            display="block"
          >
            <EuiFieldText
              disabled={hasSecondaryMetric}
              value={state.extraText}
              onChange={(event) =>
                setState({
                  ...state,
                  extraText: event.target.value,
                })
              }
            />
          </EuiToolTip>
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
