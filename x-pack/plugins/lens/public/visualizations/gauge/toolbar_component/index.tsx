/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../../../types';
import {
  ToolbarPopover,
  TooltipWrapper,
  useDebouncedValue,
  VisLabel,
} from '../../../shared_components';
import './gauge_config_panel.scss';
import {
  GaugeTicksPositions,
  GaugeTitleMode,
  GaugeVisualizationState,
} from '../../../../common/expressions';

export const GaugeToolbar = memo((props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState, frame } = props;
  const metricDimensionTitle =
    state.layerId &&
    frame.activeData?.[state.layerId]?.columns.find((col) => col.id === state.metricAccessor)?.name;

  const [subtitleMode, setSubtitleMode] = useState<GaugeTitleMode>(() =>
    state.subtitle ? 'custom' : 'none'
  );

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange: setState,
    value: state,
  });

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <ToolbarPopover
            handleClose={() => {
              setSubtitleMode(inputValue.subtitle ? 'custom' : 'none');
            }}
            title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            panelClassName="lnsGaugeToolbar__popover"
          >
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.title.header', {
                defaultMessage: 'Title',
              })}
              fullWidth
            >
              <VisLabel
                header={i18n.translate('xpack.lens.label.gauge.title.header', {
                  defaultMessage: 'Title',
                })}
                dataTestSubj="lens-toolbar-gauge-title"
                label={inputValue.visTitle || ''}
                mode={inputValue.visTitleMode}
                placeholder={metricDimensionTitle || ''}
                hasAutoOption={true}
                handleChange={(value) => {
                  handleInputChange({
                    ...inputValue,
                    visTitle: value.label,
                    visTitleMode: value.mode,
                  });
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.subtitle.header', {
                defaultMessage: 'Subtitle',
              })}
            >
              <VisLabel
                header={i18n.translate('xpack.lens.label.gauge.subtitle.header', {
                  defaultMessage: 'Subtitle',
                })}
                dataTestSubj="lens-toolbar-gauge-subtitle"
                label={inputValue.subtitle || ''}
                mode={subtitleMode}
                handleChange={(value) => {
                  handleInputChange({
                    ...inputValue,
                    subtitle: value.label,
                  });
                  setSubtitleMode(value.mode);
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressedSwitch"
              label={i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                defaultMessage: 'Ticks on color bands',
              })}
            >
              <TooltipWrapper
                tooltipContent={i18n.translate('xpack.lens.gauge.toolbar.colorBandsDisabled', {
                  defaultMessage: 'Add color bands in metric value settings to enable this setting',
                })}
                condition={state.colorMode !== 'palette'}
                position="top"
                delay="regular"
                display="block"
              >
                <EuiSwitch
                  compressed
                  label={i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                    defaultMessage: 'Ticks on color bands',
                  })}
                  data-test-subj="lens-toolbar-gauge-ticks-position-switch"
                  showLabel={false}
                  disabled={state.colorMode !== 'palette'}
                  checked={state.ticksPosition === GaugeTicksPositions.bands}
                  onChange={() => {
                    handleInputChange({
                      ...inputValue,
                      ticksPosition:
                        state.ticksPosition === GaugeTicksPositions.bands
                          ? GaugeTicksPositions.auto
                          : GaugeTicksPositions.bands,
                    });
                  }}
                />
              </TooltipWrapper>
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
