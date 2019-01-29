/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiRange,
  EuiSpacer,
} from '@elastic/eui';
import { ValidatedRange } from '../../../shared/components/validated_range';

export function SettingsPanel(props) {

  const onLabelChange = (event) => {
    const label = event.target.value;
    props.updateLabel(props.layerId, label);
  };

  const onMinZoomChange = (event) => {
    const zoom = parseInt(event.target.value, 10);
    props.updateMinZoom(props.layerId, zoom);
  };

  const onMaxZoomChange = (event) => {
    const zoom = parseInt(event.target.value, 10);
    props.updateMaxZoom(props.layerId, zoom);
  };

  const onAlphaChange = (alpha) => {
    props.updateAlpha(props.layerId, alpha);
  };

  const onSourceChange = ({ propName, value }) => {
    props.updateSourceProp(props.layerId, propName, value);
  };

  const renderZoomSliders = () => {
    return (
      <EuiFormRow
        helpText="Display layer when map is within zoom level range."
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Min zoom"
            >
              <EuiRange
                min={0}
                max={24}
                value={props.minZoom.toString()}
                onChange={onMinZoomChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Max zoom"
            >
              <EuiRange
                min={0}
                max={24}
                value={props.maxZoom.toString()}
                onChange={onMaxZoomChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label="Layer display name"
      >
        <EuiFieldText
          value={props.label}
          onChange={onLabelChange}
        />
      </EuiFormRow>
    );
  };

  const renderAlphaSlider = () => {
    return (
      <EuiFormRow
        label="Layer transparency"
      >
        <div className="gisAlphaRange">
          <ValidatedRange
            min={.00}
            max={1.00}
            step={.05}
            value={props.alpha}
            onChange={onAlphaChange}
            showLabels
            showInput
            showRange
          />
        </div>
      </EuiFormRow>
    );
  };

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs"><h5>Settings</h5></EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer margin="m"/>

      {renderLabel()}

      {renderZoomSliders()}

      {renderAlphaSlider()}

      {props.layer.renderSourceSettingsEditor({ onChange: onSourceChange })}

    </EuiPanel>
  );
}
