/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import moment from 'moment';
import { AnnotationConfig } from 'src/plugins/event_annotation/common/types';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState } from '../types';
import { FormatFactory } from '../../../common';
import { XYAnnotationLayerConfig } from '../../../common/expressions';
import { ColorPicker } from '../xy_config_panel/color_picker';
import { NameInput, useDebouncedValue } from '../../shared_components';
import { isHorizontalChart } from '../state_helpers';
import { MarkerDecorationSettings } from '../xy_config_panel/shared/marker_decoration_settings';
import { LineStyleSettings } from '../xy_config_panel/shared/line_style_settings';
import { updateLayer } from '../xy_config_panel';
import { Square, Triangle, Hexagon, Circle } from '../../assets/annotation_icons';
import { euiIconsSet } from '../xy_config_panel/shared/icon_select';

export const defaultAnnotationLabel = i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
  defaultMessage: 'Static Annotation',
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
    (config: Partial<AnnotationConfig> | undefined) => {
      if (config == null) {
        return;
      }
      const newConfigs = [...(localLayer.config || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...config };
      } else {
        // that should never happen
        return;
      }
      setLocalState(updateLayer(localState, { ...localLayer, config: newConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );
  return (
    <>
      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.annotationDate', {
          defaultMessage: 'Annotation date',
        })}
      >
        <EuiDatePicker
          showTimeSelect
          selected={moment(currentConfig?.key.timestamp)}
          onChange={(date) => {
            if (date) {
              setConfig({
                key: {
                  ...(currentConfig?.key || { keyType: 'point_in_time' }),
                  type: 'annotation_key',
                  timestamp: date?.valueOf(),
                },
              });
            }
          }}
          dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
          data-test-subj="lnsXY_axisOrientation_groups"
        />
      </EuiFormRow>
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
        currentConfig={currentConfig}
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
          checked={Boolean(currentConfig?.isHidden)}
          onChange={(ev) => setConfig({ isHidden: ev.target.checked })}
        />
      </EuiFormRow>
    </>
  );
};

const annotationsIconSet = [
  {
    value: 'triangle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.triangleIconLabel', {
      defaultMessage: 'Triangle',
    }),
    icon: Triangle,
  },
  {
    value: 'square',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.squareIconLabel', {
      defaultMessage: 'Square',
    }),
    icon: Square,
  },
  {
    value: 'circle',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.circleIconLabel', {
      defaultMessage: 'Circle',
    }),
    icon: Circle,
  },
  {
    value: 'hexagon',
    label: i18n.translate('xpack.lens.xyChart.iconSelect.hexagonIconLabel', {
      defaultMessage: 'Hexagon',
    }),
    icon: Hexagon,
  },
  ...euiIconsSet,
];
