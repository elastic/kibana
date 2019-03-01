/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiCallOut,
  EuiDualRange
} from '@elastic/eui';

import { ValidatedRange } from '../../../shared/components/validated_range';

const MIN_ZOOM = 0;
const MAX_ZOOM = 24;

export function SettingsPanel(props) {

  const onLabelChange = (event) => {
    const label = event.target.value;
    props.updateLabel(props.layerId, label);
  };

  const onZoomChange = (event) => {
    const minZoom = Math.max(MIN_ZOOM, parseInt(event[0], 10));
    props.updateMinZoom(props.layerId, minZoom);
    const maxZoom = Math.min(MAX_ZOOM, parseInt(event[1], 10));
    props.updateMaxZoom(props.layerId, maxZoom);
  };

  const onAlphaChange = (alpha) => {
    props.updateAlpha(props.layerId, alpha);
  };

  const onSourceChange = ({ propName, value }) => {
    props.updateSourceProp(props.layerId, propName, value);
  };

  const renderLayerErrors = () => {
    if (!props.layer.hasErrors()) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          color="warning"
          title="Unable to load layer"
        >
          <p data-test-subj="layerErrorMessage">
            {props.layer.getErrors()}
          </p>
        </EuiCallOut>
        <EuiSpacer margin="m"/>
      </Fragment>
    );
  };

  const renderZoomSliders = () => {
    return (
      <EuiFormRow
        helpText="Display layer when map is in zoom range."
      >
        <EuiFlexGroup>
          <EuiFlexItem>

            <EuiFormRow
              label={'Min and max zoom'}
            >
              <EuiDualRange
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={1}
                value={[props.minZoom, props.maxZoom]}
                showInput
                onChange={onZoomChange}
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
        label="Layer name"
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
        <div className="mapAlphaRange">
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
    <Fragment>

      {renderLayerErrors()}

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
    </Fragment>
  );
}
