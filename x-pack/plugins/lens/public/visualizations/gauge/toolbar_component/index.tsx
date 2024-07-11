/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GaugeLabelMajorMode, GaugeShape, GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover, VisLabel } from '../../../shared_components';
import './gauge_config_panel.scss';
import type { GaugeVisualizationState } from '../constants';
import { CHART_NAMES, bulletTypes, gaugeShapes } from '../visualization';

export const GaugeToolbar = memo((props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState, frame } = props;
  const metricDimensionTitle =
    state.layerId &&
    frame.activeData?.[state.layerId]?.columns.find((col) => col.id === state.metricAccessor)?.name;

  const [subtitleMode, setSubtitleMode] = useState<GaugeLabelMajorMode>(() =>
    state.labelMinor ? 'custom' : 'none'
  );

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange: setState,
    value: state,
  });

  const selectedOption = CHART_NAMES[state.shape];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <ToolbarPopover
            handleClose={() => {
              setSubtitleMode(inputValue.labelMinor ? 'custom' : 'none');
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
              label={i18n.translate('xpack.lens.label.gauge.labelMajor.header', {
                defaultMessage: 'Title',
              })}
              fullWidth
            >
              <VisLabel
                header={i18n.translate('xpack.lens.label.gauge.labelMajor.header', {
                  defaultMessage: 'Title',
                })}
                dataTestSubj="lnsToolbarGaugeLabelMajor"
                label={inputValue.labelMajor || ''}
                mode={inputValue.labelMajorMode}
                placeholder={metricDimensionTitle || ''}
                hasAutoOption={true}
                handleChange={(value) => {
                  handleInputChange({
                    ...inputValue,
                    labelMajor: value.label,
                    labelMajorMode: value.mode,
                  });
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.labelMinor.header', {
                defaultMessage: 'Subtitle',
              })}
            >
              <VisLabel
                header={i18n.translate('xpack.lens.label.gauge.labelMinor.header', {
                  defaultMessage: 'Subtitle',
                })}
                dataTestSubj="lnsToolbarGaugeLabelMinor"
                label={inputValue.labelMinor || ''}
                mode={subtitleMode}
                handleChange={(value) => {
                  handleInputChange({
                    ...inputValue,
                    labelMinor: value.mode === 'none' ? '' : value.label,
                  });
                  setSubtitleMode(value.mode);
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              display="columnCompressed"
              label={i18n.translate('xpack.lens.label.gauge.angleType', {
                defaultMessage: 'Type',
              })}
            >
              <EuiComboBox
                fullWidth
                compressed
                data-test-subj="lnsToolbarGaugeAngleType"
                aria-label="Label"
                onChange={([option]) => {
                  setState({ ...state, shape: option.value as GaugeShape });
                }}
                isClearable={false}
                options={gaugeShapes.map(({ id, label, icon }) => ({
                  value: id,
                  label,
                  prepend: <EuiIcon type={icon} />,
                }))}
                selectedOptions={[selectedOption]}
                singleSelection={{ asPlainText: true }}
                prepend={<EuiIcon type={selectedOption.icon} />}
              />
            </EuiFormRow>
            {(state.shape === GaugeShapes.HORIZONTAL_BULLET ||
              state.shape === GaugeShapes.VERTICAL_BULLET) && (
              <EuiFormRow
                fullWidth
                display="columnCompressed"
                label={i18n.translate('xpack.lens.label.gauge.angleType', {
                  defaultMessage: 'Type',
                })}
              >
                <EuiButtonGroup
                  isFullWidth
                  legend={i18n.translate('xpack.lens.gauge.bulletType', {
                    defaultMessage: 'Bullet type',
                  })}
                  data-test-subj="lens-gauge-bullet-type"
                  buttonSize="compressed"
                  options={bulletTypes}
                  idSelected={selectedOption.id}
                  onChange={(optionId) => {
                    const newBulletType = bulletTypes.find(({ id }) => id === optionId)!.id;
                    setState({ ...state, shape: newBulletType as GaugeShape });
                  }}
                />
              </EuiFormRow>
            )}
          </ToolbarPopover>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
