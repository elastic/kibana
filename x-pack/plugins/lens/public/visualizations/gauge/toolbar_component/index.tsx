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
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GaugeLabelMajorMode, GaugeShape, GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import { useDebouncedValue } from '@kbn/visualization-utils';
import {
  IconChartGaugeArcSimple,
  IconChartGaugeCircleSimple,
  IconChartGaugeSemiCircleSimple,
  IconChartLinearSimple,
} from '@kbn/chart-icons';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover, VisLabel } from '../../../shared_components';
import './gauge_config_panel.scss';
import { gaugeTitlesByType, type GaugeVisualizationState } from '../constants';

const PREFIX = `lns_gaugeOrientation_`;
export const bulletTypes = [
  {
    id: `${PREFIX}horizontalBullet`,
    label: i18n.translate('xpack.lens.gauge.bullet.orientantionHorizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
  {
    id: `${PREFIX}verticalBullet`,
    label: i18n.translate('xpack.lens.gauge.bullet.orientantionVertical', {
      defaultMessage: 'Vertical',
    }),
  },
];

const CHART_NAMES: Record<GaugeShape, { id: string; icon: IconType; label: string }> = {
  horizontalBullet: {
    id: GaugeShapes.HORIZONTAL_BULLET,
    icon: IconChartLinearSimple,
    label: i18n.translate('xpack.lens.gaugeLinear.gaugeLabel', {
      defaultMessage: 'Linear',
    }),
  },
  verticalBullet: {
    id: GaugeShapes.VERTICAL_BULLET,
    icon: IconChartLinearSimple,
    label: i18n.translate('xpack.lens.gaugeLinear.gaugeLabel', {
      defaultMessage: 'Linear',
    }),
  },
  semiCircle: {
    id: GaugeShapes.SEMI_CIRCLE,
    icon: IconChartGaugeSemiCircleSimple,
    label: gaugeTitlesByType.semiCircle,
  },
  arc: {
    id: GaugeShapes.ARC,
    icon: IconChartGaugeArcSimple,
    label: gaugeTitlesByType.arc,
  },
  circle: {
    id: GaugeShapes.CIRCLE,
    icon: IconChartGaugeCircleSimple,
    label: gaugeTitlesByType.circle,
  },
};

const gaugeShapes = [
  CHART_NAMES.horizontalBullet,
  CHART_NAMES.semiCircle,
  CHART_NAMES.arc,
  CHART_NAMES.circle,
];

export const GaugeToolbar = memo((props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <AppearancePopover {...props} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TitlesAndTextPopover {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const AppearancePopover = (props: VisualizationToolbarProps<GaugeVisualizationState>) => {
  const { state, setState } = props;

  const selectedOption = CHART_NAMES[state.shape];
  const selectedBulletType = bulletTypes.find(({ id }) => id === `${PREFIX}${state.shape}`);
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
        defaultMessage: 'Appearance',
      })}
      type="visualOptions"
      buttonDataTestSubj="lnsVisualOptionsButton"
      panelClassName="lnsGaugeToolbar__popover"
      data-test-subj="lnsVisualOptionsPopover"
    >
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('xpack.lens.label.gauge.angleType', {
          defaultMessage: 'Gauge shape',
        })}
      >
        <EuiComboBox
          fullWidth
          compressed
          data-test-subj="lnsToolbarGaugeAngleType"
          aria-label={i18n.translate('xpack.lens.label.gauge.angleType', {
            defaultMessage: 'Gauge shape',
          })}
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
        state.shape === GaugeShapes.VERTICAL_BULLET) &&
        selectedBulletType && (
          <EuiFormRow fullWidth display="columnCompressed" label=" ">
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.gauge.bulletType', {
                defaultMessage: 'Bullet type',
              })}
              data-test-subj="lens-gauge-bullet-type"
              buttonSize="compressed"
              options={bulletTypes}
              idSelected={selectedBulletType.id}
              onChange={(optionId) => {
                const newBulletTypeWithPrefix = bulletTypes.find(({ id }) => id === optionId)!.id;
                const newBulletType = newBulletTypeWithPrefix.replace(PREFIX, '');
                setState({ ...state, shape: newBulletType as GaugeShape });
              }}
            />
          </EuiFormRow>
        )}
    </ToolbarPopover>
  );
};

const TitlesAndTextPopover = (props: VisualizationToolbarProps<GaugeVisualizationState>) => {
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

  return (
    <ToolbarPopover
      handleClose={() => {
        setSubtitleMode(inputValue.labelMinor ? 'custom' : 'none');
      }}
      title={i18n.translate('xpack.lens.gauge.appearanceLabel', {
        defaultMessage: 'Titles and text',
      })}
      type="titlesAndText"
      buttonDataTestSubj="lnsTextOptionsButton"
      panelClassName="lnsGaugeToolbar__popover"
      data-test-subj="lnsTextOptionsPopover"
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
    </ToolbarPopover>
  );
};
