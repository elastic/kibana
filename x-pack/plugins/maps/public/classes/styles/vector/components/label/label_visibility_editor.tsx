/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { LabelVisibilityStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { getVectorStyleLabel, getDisabledByMessage } from '../get_vector_style_label';
import { LabelVisibilityProperty } from '../../properties/layer_visibility_property';

interface Props {
  disabled: boolean;
  disabledBy: VECTOR_STYLES;
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: LabelVisibilityStylePropertyDescriptor) => void;
  styleProperty: LabelVisibilityProperty;
}

export function LabelVisibilityEditor(props: Props) {
  const layerVisiblity = props.styleProperty.getLayerVisibility();
  const labelVisiblity = props.styleProperty.getLabelVisibility();

  const onSwitchChange = (event: EuiSwitchEvent) => {
    props.handlePropertyChange(props.styleProperty.getStyleName(), {
      options: {
        ...props.styleProperty.getOptions(),
        useLayerVisibility: event.target.checked,
      },
    });
  };

  const onZoomChange = (value: [string, string]) => {
    props.handlePropertyChange(props.styleProperty.getStyleName(), {
      options: {
        ...props.styleProperty.getOptions(),
        minZoom: Math.max(layerVisiblity.min, parseInt(value[0], 10)),
        maxZoom: Math.min(layerVisiblity.maxZoom, parseInt(value[1], 10)),
      },
    });
  };

  const { useLayerVisibility } = props.styleProperty.getOptions();
  const slider = useLayerVisibility
    ? null
    : <ValidatedDualRange
          formRowDisplay="columnCompressed"
          min={layerVisiblity.min}
          max={layerVisiblity.max}
          value={[labelVisiblity.min, labelVisiblity.max]}
          showInput="inputWithPopover"
          showRange
          showLabels
          onChange={onZoomChange}
          allowEmptyRange={false}
          compressed
          prepend={i18n.translate('xpack.maps.styles.labelVisibility.visibleZoom', {
            defaultMessage: 'Label zoom levels',
          })}
        />;

  const form = (
    <EuiFormRow
      label={getVectorStyleLabel(props.styleProperty.getStyleName())}
    >
      <div>
        <EuiSwitch
          label={i18n.translate('xpack.maps.styles.labelVisibility.useLayerLabel', {
            defaultMessage: 'Use layer visibility',
          })}
          checked={useLayerVisibility}
          onChange={onSwitchChange}
          compressed
        />
        {slider}
      </div>
    </EuiFormRow>
  );

  if (!props.disabled) {
    return form;
  }

  return (
    <EuiToolTip
      anchorClassName="mapStyleFormDisabledTooltip"
      content={getDisabledByMessage(props.disabledBy)}
    >
      {form}
    </EuiToolTip>
  );
}
