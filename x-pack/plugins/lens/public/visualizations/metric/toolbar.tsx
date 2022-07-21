/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiFieldText,
  EuiToolTip,
  EuiButtonGroup,
  EuiFieldNumber,
} from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover } from '../../shared_components';
import { DEFAULT_MAX_COLUMNS, MetricVisualizationState } from './visualization';

export function MetricToolbar(props: VisualizationToolbarProps<MetricVisualizationState>) {
  const { state, setState } = props;

  const hasBreakdownBy = Boolean(state.breakdownByAccessor);
  const idPrefix = htmlIdGenerator()();

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
      </ToolbarPopover>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.metric.appearanceLabel', {
          defaultMessage: 'Appearance',
        })}
        type="visualOptions"
        groupPosition="right"
        buttonDataTestSubj="lnsVisualOptionsButton"
      >
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
            defaultMessage: 'Progress bar direction',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
              defaultMessage: 'Progress bar direction',
            })}
            data-test-subj="lnsMetric_progress_direction_buttons"
            name="alignment"
            options={[
              {
                id: `${idPrefix}vertical`,
                label: i18n.translate('xpack.lens.metric.progressDirection.vertical', {
                  defaultMessage: 'Vertical',
                }),
                'data-test-subj': 'lnsMetric_progress_bar_vertical',
              },
              {
                id: `${idPrefix}horizontal`,
                label: i18n.translate('xpack.lens.metric.progressDirection.horizontal', {
                  defaultMessage: 'Horizontal',
                }),
                'data-test-subj': 'lnsMetric_progress_bar_horizontal',
              },
            ]}
            idSelected={`${idPrefix}${state.progressDirection ?? 'vertical'}`}
            onChange={(id) => {
              const newDirection = id.replace(idPrefix, '') as LayoutDirection;
              setState({
                ...state,
                progressDirection: newDirection,
              });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.maxColumns', {
            defaultMessage: 'Max columns',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiFieldNumber
            value={state.maxCols ?? DEFAULT_MAX_COLUMNS}
            onChange={(event) => setState({ ...state, maxCols: parseInt(event.target.value, 10) })}
          />
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
