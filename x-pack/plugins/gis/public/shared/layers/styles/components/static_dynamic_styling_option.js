/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyle } from '../vector_style';
import _ from 'lodash';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiFormRow,
  EuiButtonToggle
} from '@elastic/eui';

export class StaticDynamicStyleSelector extends React.Component {

  // Store previous options locally so when type is toggled,
  // previous style options can be used.
  prevOptions = {
    // TODO: Move default to central location with other defaults
    color: '#e6194b'
  }

  _canBeDynamic() {
    return this.props.ordinalFields.length > 0;
  }

  _isDynamic() {
    if (!this.props.styleDescriptor) {
      return false;
    }
    return this.props.styleDescriptor.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  _getStyleOptions() {
    return _.get(this.props, 'styleDescriptor.options');
  }

  _onStaticStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options
    };
    this.props.handlePropertyChange(this.props.property, styleDescriptor);
  }

  _onDynamicStyleChange = options => {
    const styleDescriptor = {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options
    };
    this.props.handlePropertyChange(this.props.property, styleDescriptor);
  }

  _onTypeToggle = () => {
    if (this._isDynamic()) {
      // toggle to static style
      this._onStaticStyleChange(this.prevOptions);
    } else {
      // toggle to dynamic style
      this._onDynamicStyleChange(this.prevOptions);
    }

    this.prevOptions = this._getStyleOptions();
  }

  _renderStyleSelector() {
    if (this._isDynamic()) {
      const DynamicSelector = this.props.DynamicSelector;
      return (
        <DynamicSelector
          fields={this.props.ordinalFields}
          onChange={this._onDynamicStyleChange}
          selectedOptions={this._getStyleOptions()}
        />
      );
    }

    const StaticSelector = this.props.StaticSelector;
    return (
      <StaticSelector
        changeOptions={this._onStaticStyleChange}
        selectedOptions={this._getStyleOptions()}
      />
    );
  }

  render() {
    const isDynamic = this._isDynamic();
    const dynamicTooltipContent =
      isDynamic ? "Disable dynamic styling." : "Enable dynamic styling.";

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem className={isDynamic ? 'gisStaticDynamicSylingOption__dynamicSizeHack' : undefined}>
          <EuiFormRow label={this.props.name && this.props.name}>
            {this._renderStyleSelector()}
          </EuiFormRow>
        </EuiFlexItem>
        {this._canBeDynamic() &&
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiToolTip
                content={dynamicTooltipContent}
                delay="long"
              >
                <EuiButtonToggle
                  label={dynamicTooltipContent}
                  iconType="link"
                  onChange={this._onTypeToggle}
                  isEmpty={!isDynamic}
                  fill={isDynamic}
                  isIconOnly
                />
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    );
  }
}
