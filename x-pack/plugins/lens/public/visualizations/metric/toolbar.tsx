/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiFieldText,
  EuiToolTip,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiColorPicker,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover, useDebouncedValue } from '../../shared_components';
import { DEFAULT_MAX_COLUMNS, MetricVisualizationState } from './visualization';
import { getDefaultColor } from './visualization';

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

  const defaultColor = getDefaultColor(!!state.maxAccessor);

  const setColor = useCallback(
    (color: string) => {
      setState({ ...state, color: color || defaultColor });
    },
    [defaultColor, setState, state]
  );

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: state.color || '',
      },
      { allowFalsyValue: true }
    );

  const colorLabel = i18n.translate('xpack.lens.metric.color', {
    defaultMessage: 'Color',
  });

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
              value={subtitleInputVal}
              onChange={({ target: { value } }) => handleSubtitleChange(value)}
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
          <EuiToolTip
            position="right"
            content={
              !state.maxAccessor ? (
                <p>
                  {i18n.translate('xpack.lens.metric.progressDirectionDisabledExplanation', {
                    defaultMessage: 'Add a maximum to your visualization to see a progress bar.',
                  })}
                </p>
              ) : null
            }
            display="block"
          >
            <EuiButtonGroup
              isFullWidth
              buttonSize="compressed"
              legend={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
                defaultMessage: 'Progress bar direction',
              })}
              isDisabled={!state.maxAccessor}
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
          </EuiToolTip>
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.metric.maxColumns', {
            defaultMessage: 'Max columns',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiFieldNumber
            data-test-subj="lnsMetric_max_cols"
            value={state.maxCols ?? DEFAULT_MAX_COLUMNS}
            onChange={(event) => setState({ ...state, maxCols: parseInt(event.target.value, 10) })}
          />
        </EuiFormRow>

        <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
          {/* TODO - could we give the user a button to disable color-by-value? */}
          <EuiToolTip
            content={
              state.palette ? (
                <p>
                  {i18n.translate('xpack.lens.metric.colorIgnoredExplanation', {
                    defaultMessage:
                      'Ignored because dynamic coloring is configured on the metric dimension. Disable "color by value" to use this color instead.',
                  })}
                </p>
              ) : null
            }
            position="right"
            display="block"
          >
            <EuiColorPicker
              fullWidth
              data-test-subj="lnsMetric_colorpicker"
              compressed
              isClearable={true}
              onChange={(color: string) => handleColorChange(color)}
              color={currentColor}
              disabled={!!state.palette}
              placeholder={defaultColor}
              aria-label={colorLabel}
              showAlpha={false}
              swatches={euiPaletteColorBlind()}
            />
          </EuiToolTip>
        </EuiFormRow>
      </ToolbarPopover>
    </EuiFlexGroup>
  );
}
