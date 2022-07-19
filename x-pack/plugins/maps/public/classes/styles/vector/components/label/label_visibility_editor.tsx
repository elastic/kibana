/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { LabelVisibilityStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { getVectorStyleLabel, getDisabledByMessage } from '../get_vector_style_label';
import { LabelVisibilityProperty } from '../../properties/layer_visibility_property';

interface Props {
  disabled: boolean;
  disabledBy: VECTOR_STYLES;
  handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: LabelVisibilityStylePropertyDescriptor) => void;
  layerMinZoom: number;
  layerMaxZoom: number;
  styleProperty: LabelVisibilityProperty;
}

export function LabelVisibilityEditor(props: Props) {
  const onSwitchChange = (event: EuiSwitchEvent) => {
    props.handlePropertyChange(props.styleProperty.getStyleName(), {
      options: {
        ...props.styleProperty.getOptions(),
        useLayerVisibility: event.target.checked,
      },
    });
  };

  const form = (
    <EuiFormRow
      label={getVectorStyleLabel(props.styleProperty.getStyleName())}
    >
      <EuiSwitch
        label={i18n.translate('xpack.maps.styles.labelVisibility.useLayerLabel', {
          defaultMessage: 'Use layer visibility',
        })}
        checked={props.styleProperty.getOptions().useLayerVisibility}
        onChange={onSwitchChange}
        compressed
      />
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
