/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { VectorStyleColorEditor } from './color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './size/vector_style_size_editor';

import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

export class VectorStyleEditor extends Component {
  state = {
    ordinalFields: []
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOrdinalFields();
  }

  componentDidUpdate() {
    this._loadOrdinalFields();
  }

  async _loadOrdinalFields() {
    const ordinalFields = await this.props.layer.getOrdinalFields();
    if (!this._isMounted) {
      return;
    }
    if (!_.isEqual(ordinalFields, this.state.ordinalFields)) {
      this.setState({ ordinalFields });
    }
  }

  render() {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <VectorStyleColorEditor
            styleProperty="fillColor"
            stylePropertyName="Fill color"
            handlePropertyChange={this.props.handlePropertyChange}
            styleDescriptor={this.props.styleProperties.fillColor}
            ordinalFields={this.state.ordinalFields}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <VectorStyleColorEditor
            styleProperty="lineColor"
            stylePropertyName="Border color"
            handlePropertyChange={this.props.handlePropertyChange}
            styleDescriptor={this.props.styleProperties.lineColor}
            ordinalFields={this.state.ordinalFields}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <VectorStyleSizeEditor
            styleProperty="lineWidth"
            stylePropertyName="Border width"
            handlePropertyChange={this.props.handlePropertyChange}
            styleDescriptor={this.props.styleProperties.lineWidth}
            ordinalFields={this.state.ordinalFields}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <VectorStyleSizeEditor
            styleProperty="iconSize"
            stylePropertyName="Symbol size"
            handlePropertyChange={this.props.handlePropertyChange}
            styleDescriptor={this.props.styleProperties.iconSize}
            ordinalFields={this.state.ordinalFields}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
