/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDatePicker, EuiFormRow, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import moment from 'moment';
import { EventAnnotationConfig } from 'src/plugins/event_annotation/common/types';
import type { VisualizationDimensionEditorProps } from '../../../types';
import { State, XYState, XYAnnotationLayerConfig } from '../../types';
import { FormatFactory } from '../../../../common';
import { DimensionEditorSection, NameInput, useDebouncedValue } from '../../../shared_components';
import { isHorizontalChart } from '../../state_helpers';
import { defaultAnnotationLabel } from '../../annotations/helpers';
import { ColorPicker } from '../color_picker';
import { IconSelectSetting, TextDecorationSetting } from '../shared/marker_decoration_settings';
import { LineStyleSettings } from '../shared/line_style_settings';
import { updateLayer } from '..';
import { annotationsIconSet } from './icon_set';

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

  const currentAnnotations = localLayer.annotations?.find((c) => c.id === accessor);

  const setAnnotations = useCallback(
    (annotations: Partial<EventAnnotationConfig> | undefined) => {
      if (annotations == null) {
        return;
      }
      const newConfigs = [...(localLayer.annotations || [])];
      const existingIndex = newConfigs.findIndex((c) => c.id === accessor);
      if (existingIndex !== -1) {
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...annotations };
      } else {
        return; // that should never happen because annotations are created before annotations panel is opened
      }
      setLocalState(updateLayer(localState, { ...localLayer, annotations: newConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );

  return (
    <>
      <DimensionEditorSection
        title={i18n.translate('xpack.lens.xyChart.placement', {
          defaultMessage: 'Placement',
        })}
      >
        <ConfigPanelDatePicker
          value={moment(currentAnnotations?.key.timestamp)}
          onChange={(date) => {
            if (date) {
              setAnnotations({
                key: {
                  ...(currentAnnotations?.key || { type: 'point_in_time' }),
                  timestamp: date.toISOString(),
                },
              });
            }
          }}
          label={i18n.translate('xpack.lens.xyChart.annotationDate', {
            defaultMessage: 'Annotation date',
          })}
        />
      </DimensionEditorSection>
      <DimensionEditorSection
        title={i18n.translate('xpack.lens.xyChart.appearance', {
          defaultMessage: 'Appearance',
        })}
      >
        <NameInput
          value={currentAnnotations?.label || defaultAnnotationLabel}
          defaultValue={defaultAnnotationLabel}
          onChange={(value) => {
            setAnnotations({ label: value });
          }}
        />
        <IconSelectSetting
          setConfig={setAnnotations}
          currentConfig={{
            axisMode: 'bottom',
            ...currentAnnotations,
          }}
          customIconSet={annotationsIconSet}
        />
        <TextDecorationSetting
          setConfig={setAnnotations}
          currentConfig={{
            axisMode: 'bottom',
            ...currentAnnotations,
          }}
        />
        <LineStyleSettings
          isHorizontal={isHorizontal}
          setConfig={setAnnotations}
          currentConfig={currentAnnotations}
        />
        <ColorPicker
          {...props}
          setConfig={setAnnotations}
          disableHelpTooltip
          label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
            defaultMessage: 'Color',
          })}
        />
        <ConfigPanelHideSwitch
          value={Boolean(currentAnnotations?.isHidden)}
          onChange={(ev) => setAnnotations({ isHidden: ev.target.checked })}
        />
      </DimensionEditorSection>
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
        fullWidth
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
      fullWidth
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
