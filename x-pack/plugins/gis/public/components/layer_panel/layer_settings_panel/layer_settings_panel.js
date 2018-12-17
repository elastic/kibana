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

import _ from 'lodash';

export function LayerSettingsPanel({
  alphaValue,
  layerId,
  label,
  minZoom,
  maxZoom,
  updateAlphaValue,
  updateLabel,
  updateMinZoom,
  updateMaxZoom,
}) {

  function onLabelChange(event) {
    const label = event.target.value;
    updateLabel(layerId, label);
  }

  function onMinZoomChange(event) {
    const zoom = parseInt(event.target.value, 10);
    updateMinZoom(layerId, zoom);
  }

  function onMaxZoomChange(event) {
    const zoom = parseInt(event.target.value, 10);
    updateMaxZoom(layerId, zoom);
  }

  const debouncedAlphaChange = _.debounce((alphaValue) => {
    updateAlphaValue(layerId, alphaValue);
  }, 250);

  function onAlphaValueChange(event) {
    const sanitizedValue = parseFloat(event.target.value);
    const alphaValue = isNaN(sanitizedValue) ? '' : sanitizedValue;
    debouncedAlphaChange(alphaValue);
  }

  function renderZoomSliders() {
    return (
      <EuiFormRow
        helpText="Dislay layer when map is within zoom level range."
        compressed
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Min zoom"
              compressed
            >
              <EuiRange
                min={0}
                max={24}
                value={minZoom.toString()}
                onChange={onMinZoomChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label="Max zoom"
              compressed
            >
              <EuiRange
                min={0}
                max={24}
                value={maxZoom.toString()}
                onChange={onMaxZoomChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

  function renderLabel() {
    return (
      <EuiFormRow
        label="Layer display name"
        compressed
      >
        <EuiFieldText
          value={label}
          onChange={onLabelChange}
        />
      </EuiFormRow>
    );
  }

  function renderAlphaSlider() {
    return (
      <EuiFormRow
        label="Layer opacity"
        compressed
      >
        <div className="alphaRange">
          <EuiRange
            min={.00}
            max={1.00}
            step={.05}
            value={alphaValue.toString()} // EuiRange value must be string
            onChange={onAlphaValueChange}
            showLabels
            showInput
            showRange
          />
        </div>
      </EuiFormRow>
    );
  }

  return (
    <EuiPanel>
      <EuiTitle size="xs"><h5>Layer settings</h5></EuiTitle>
      <EuiSpacer margin="m"/>

      {renderLabel()}

      {renderZoomSliders()}

      {renderAlphaSlider()}

    </EuiPanel>
  );
}
