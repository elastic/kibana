/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiRange,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

export class SettingsPanel extends Component {

  state = {
    showSourceDetails: false,
  }

  toggleSourceDetails = () => {
    this.setState((prevState) => ({
      showSourceDetails: !prevState.showSourceDetails,
    }));
  }

  onLabelChange = (event) => {
    const label = event.target.value;
    this.props.updateLabel(this.props.layerId, label);
  }

  onMinZoomChange = (event) => {
    const zoom = parseInt(event.target.value, 10);
    this.props.updateMinZoom(this.props.layerId, zoom);
  }

  onMaxZoomChange = (event) => {
    const zoom = parseInt(event.target.value, 10);
    this.props.updateMaxZoom(this.props.layerId, zoom);
  }

  onAlphaValueChange = (event) => {
    const sanitizedValue = parseFloat(event.target.value);
    const alphaValue = isNaN(sanitizedValue) ? '' : sanitizedValue;
    this.props.updateAlphaValue(this.props.layerId, alphaValue);
  }

  onSourceChange = ({ propName, value }) => {
    this.props.updateSourceProp(this.props.layerId, propName, value);
  }

  renderZoomSliders() {
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
                value={this.props.minZoom.toString()}
                onChange={this.onMinZoomChange}
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
                value={this.props.maxZoom.toString()}
                onChange={this.onMaxZoomChange}
                showInput
                showRange
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }

  renderLabel() {
    return (
      <EuiFormRow
        label="Layer display name"
      >
        <EuiFieldText
          value={this.props.label}
          onChange={this.onLabelChange}
        />
      </EuiFormRow>
    );
  }

  renderAlphaSlider() {
    return (
      <EuiFormRow
        label="Layer transparency"
      >
        <div className="gisAlphaRange">
          <EuiRange
            min={.00}
            max={1.00}
            step={.05}
            value={this.props.alphaValue.toString()} // EuiRange value must be string
            onChange={this.onAlphaValueChange}
            showLabels
            showInput
            showRange
          />
        </div>
      </EuiFormRow>
    );
  }

  renderSourceDetails() {
    if (!this.state.showSourceDetails) {
      return null;
    }

    return (
      <Fragment>
        {this.props.renderSourceDetails()}
        <EuiSpacer margin="m"/>
      </Fragment>
    );
  }

  render() {
    return (
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs"><h5>Settings</h5></EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              onClick={this.toggleSourceDetails}
            >
              source details
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer margin="m"/>

        {this.renderSourceDetails()}

        {this.renderLabel()}

        {this.renderZoomSliders()}

        {this.renderAlphaSlider()}

        {this.props.renderSourceSettingsEditor({ onChange: this.onSourceChange })}

      </EuiPanel>
    );
  }
}
