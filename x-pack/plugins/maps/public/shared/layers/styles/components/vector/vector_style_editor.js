/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import { VectorStyleColorEditor } from './color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './size/vector_style_size_editor';
import { getDefaultDynamicProperties, getDefaultStaticProperties } from '../../vector_style_defaults';
import { VECTOR_FEATURE_TYPES } from '../../../sources/vector_source';

import { EuiSpacer } from '@elastic/eui';

export class VectorStyleEditor extends Component {
  state = {
    ordinalFields: [],
    defaultDynamicProperties: getDefaultDynamicProperties(),
    defaultStaticProperties: getDefaultStaticProperties(),
    supportedFeatures: undefined,
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadOrdinalFields();
    this._loadSupportedFeatures();
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

  async _loadSupportedFeatures() {
    const supportedFeatures = await this.props.source.getSupportedFeatures();
    if (!this._isMounted) {
      return;
    }
    this.setState({ supportedFeatures });
  }

  _renderFillColor() {
    return (
      <VectorStyleColorEditor
        styleProperty="fillColor"
        handlePropertyChange={this.props.handlePropertyChange}
        styleDescriptor={this.props.styleProperties.fillColor}
        ordinalFields={this.state.ordinalFields}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.fillColor.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.fillColor.options}
      />
    );
  }

  _renderLineColor() {
    return (
      <VectorStyleColorEditor
        styleProperty="lineColor"
        handlePropertyChange={this.props.handlePropertyChange}
        styleDescriptor={this.props.styleProperties.lineColor}
        ordinalFields={this.state.ordinalFields}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.lineColor.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineColor.options}
      />
    );
  }

  _renderLineWidth() {
    return (
      <VectorStyleSizeEditor
        styleProperty="lineWidth"
        handlePropertyChange={this.props.handlePropertyChange}
        styleDescriptor={this.props.styleProperties.lineWidth}
        ordinalFields={this.state.ordinalFields}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.lineWidth.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineWidth.options}
      />
    );
  }

  _renderSymbolSize() {
    return (
      <VectorStyleSizeEditor
        styleProperty="iconSize"
        handlePropertyChange={this.props.handlePropertyChange}
        styleDescriptor={this.props.styleProperties.iconSize}
        ordinalFields={this.state.ordinalFields}
        defaultStaticStyleOptions={this.state.defaultStaticProperties.iconSize.options}
        defaultDynamicStyleOptions={this.state.defaultDynamicProperties.iconSize.options}
      />
    );
  }

  _renderPointProperties() {
    return (
      <Fragment>
        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
        <EuiSpacer size="m" />

        {this._renderSymbolSize()}
      </Fragment>
    );
  }

  _renderLineProperties() {
    return (
      <Fragment>
        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
      </Fragment>
    );
  }

  _renderPolygonProperties() {
    return (
      <Fragment>
        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {this._renderLineColor()}
        <EuiSpacer size="m" />

        {this._renderLineWidth()}
      </Fragment>
    );
  }

  render() {
    if (!this.state.supportedFeatures) {
      return null;
    }

    if (this.state.supportedFeatures.length === 1) {
      switch (this.state.supportedFeatures[0]) {
        case VECTOR_FEATURE_TYPES.POINT:
          return this._renderPointProperties();
        case VECTOR_FEATURE_TYPES.LINE:
          return this._renderLineProperties();
        case VECTOR_FEATURE_TYPES.POLYGON:
          return this._renderPolygonProperties();
      }
    }

    return (
      <Fragment>

        <VectorStyleColorEditor
          styleProperty="fillColor"
          handlePropertyChange={this.props.handlePropertyChange}
          styleDescriptor={this.props.styleProperties.fillColor}
          ordinalFields={this.state.ordinalFields}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.fillColor.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.fillColor.options}
        />

        <EuiSpacer size="m" />

        <VectorStyleColorEditor
          styleProperty="lineColor"
          handlePropertyChange={this.props.handlePropertyChange}
          styleDescriptor={this.props.styleProperties.lineColor}
          ordinalFields={this.state.ordinalFields}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.lineColor.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineColor.options}
        />

        <EuiSpacer size="m" />

        <VectorStyleSizeEditor
          styleProperty="lineWidth"
          handlePropertyChange={this.props.handlePropertyChange}
          styleDescriptor={this.props.styleProperties.lineWidth}
          ordinalFields={this.state.ordinalFields}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.lineWidth.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.lineWidth.options}
        />

        <EuiSpacer size="m" />

        <VectorStyleSizeEditor
          styleProperty="iconSize"
          handlePropertyChange={this.props.handlePropertyChange}
          styleDescriptor={this.props.styleProperties.iconSize}
          ordinalFields={this.state.ordinalFields}
          defaultStaticStyleOptions={this.state.defaultStaticProperties.iconSize.options}
          defaultDynamicStyleOptions={this.state.defaultDynamicProperties.iconSize.options}
        />

      </Fragment>
    );
  }
}
