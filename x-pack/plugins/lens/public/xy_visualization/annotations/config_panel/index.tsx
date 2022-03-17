/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import moment from 'moment';
import { EventAnnotationConfig } from 'src/plugins/event_annotation/common/types';
import type { VisualizationDimensionEditorProps } from '../../../types';
import { State, XYState } from '../../types';
import { FormatFactory } from '../../../../common';
import { XYAnnotationLayerConfig } from '../../../../common/expressions';
import { ColorPicker } from '../../xy_config_panel/color_picker';
import { NameInput, useDebouncedValue } from '../../../shared_components';
import { isHorizontalChart } from '../../state_helpers';
import { MarkerDecorationSettings } from '../../xy_config_panel/shared/marker_decoration_settings';
import { LineStyleSettings } from '../../xy_config_panel/shared/line_style_settings';
import { updateLayer } from '../../xy_config_panel';
import { annotationsIconSet } from './icon_set';

export const defaultAnnotationLabel = i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
  defaultMessage: 'Event',
});

export const AnnotationsPanel = (
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) => {
  const { state, setState, layerId, accessor } = props;
  const isHorizontal = isHorizontalChart(state.layers);

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const index = localState.layers.findIndex((l) => l.layerId === layerId);
  const localLayer = localState.layers.find(
    (l) => l.layerId === layerId
  ) as XYAnnotationLayerConfig;

  const currentConfig = localLayer.config?.find((c) => c.id === accessor);

  const setConfig = useCallback(
    (config: Partial<EventAnnotationConfig> | undefined) => {
      if (config == null) {
        return;
      }
      const newConfigs = [...(localLayer.config || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...config };
      } else {
        return; // that should never happen because annotations are created before config panel is opened
      }
      setLocalState(updateLayer(localState, { ...localLayer, config: newConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );

  return (
    <>
      <ConfigPanelDatePicker
        value={moment(currentConfig?.key.timestamp)}
        onChange={(date) => {
          if (date) {
            setConfig({
              key: {
                ...(currentConfig?.key || { type: 'point_in_time' }),
                timestamp: date?.valueOf(),
              },
            });
          }
        }}
        label={i18n.translate('xpack.lens.xyChart.annotationDate', {
          defaultMessage: 'Annotation date',
        })}
      />
      <NameInput
        value={currentConfig?.label || defaultAnnotationLabel}
        defaultValue={defaultAnnotationLabel}
        onChange={(value) => {
          setConfig({ label: value });
        }}
      />
      <MarkerDecorationSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={{
          axisMode: 'bottom',
          ...currentConfig
        }}
        customIconSet={annotationsIconSet}
      />
      <LineStyleSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={currentConfig}
      />
      <ColorPicker
        {...props}
        setConfig={setConfig}
        disableHelpTooltip
        label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
          defaultMessage: 'Color',
        })}
      />
      <ConfigPanelHideSwitch
        value={Boolean(currentConfig?.isHidden)}
        onChange={(ev) => setConfig({ isHidden: ev.target.checked })}
      />
    </>
  );
};

const ConfigPanelDatePicker = ({
  value,
  label,
  onChange,
}: {
  value: moment.Moment;
  label: string;
  onChange: (val: moment.Moment | null) => void;
}) => {
  return (
    <EuiFormRow display="rowCompressed" fullWidth label={label}>
      <EuiDatePicker
        showTimeSelect
        selected={value}
        onChange={onChange}
        dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
        data-test-subj="lnsXY_annotation_date_picker"
      />
    </EuiFormRow>
  );
};

const ConfigPanelHideSwitch = ({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}) => {
  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.xyChart.annotation.name', {
        defaultMessage: 'Hide annotation',
      })}
      display="columnCompressedSwitch"
    >
      <EuiSwitch
        compressed
        label={i18n.translate('xpack.lens.xyChart.annotation.name', {
          defaultMessage: 'Hide annotation',
        })}
        showLabel={false}
        data-test-subj="lns-annotations-hide-annotation"
        checked={value}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};
