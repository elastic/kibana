/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import chrome from 'ui/chrome';
import { VectorStyleColorEditor } from './color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './size/vector_style_size_editor';
import { VectorStyleSymbolEditor } from './vector_style_symbol_editor';
import { getDefaultDynamicProperties, getDefaultStaticProperties } from '../../vector_style_defaults';
import { VECTOR_SHAPE_TYPES } from '../../../sources/vector_feature_types';
import { SYMBOLIZE_AS_CIRCLE } from '../../vector_constants';
import { i18n } from '@kbn/i18n';
import { SYMBOL_OPTIONS } from '../../symbol_utils';

import { EuiSpacer, EuiButtonGroup } from '@elastic/eui';

export class VectorStyleEditor extends Component {
  state = {
    ordinalFields: [],
    defaultDynamicProperties: getDefaultDynamicProperties(),
    defaultStaticProperties: getDefaultStaticProperties(),
    supportedFeatures: undefined,
    selectedFeatureType: undefined,
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
    this._loadSupportedFeatures();
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
    const supportedFeatures = await this.props.layer.getSource().getSupportedShapeTypes();
    const isPointsOnly = await this.props.loadIsPointsOnly();
    const isLinesOnly = await this.props.loadIsLinesOnly();

    if (!this._isMounted) {
      return;
    }

    if (_.isEqual(supportedFeatures, this.state.supportedFeatures)
      && isPointsOnly === this.state.isPointsOnly
      && isLinesOnly === this.state.isLinesOnly) {
      return;
    }

    let selectedFeature = VECTOR_SHAPE_TYPES.POLYGON;
    if (isPointsOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.POINT;
    } else if (isLinesOnly) {
      selectedFeature = VECTOR_SHAPE_TYPES.LINE;
    }

    if (!_.isEqual(supportedFeatures, this.state.supportedFeatures) ||
      selectedFeature !== this.state.selectedFeature) {
      this.setState({
        supportedFeatures,
        selectedFeature,
        isPointsOnly,
        isLinesOnly,
      });
    }
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
    let lineColor;
    let lineWidth;
    if (this.props.styleProperties.symbol.options.symbolizeAs === SYMBOLIZE_AS_CIRCLE)  {
      lineColor = (
        <Fragment>
          {this._renderLineColor()}
          <EuiSpacer size="m" />
        </Fragment>
      );
      lineWidth = (
        <Fragment>
          {this._renderLineWidth()}
          <EuiSpacer size="m" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <VectorStyleSymbolEditor
          styleOptions={this.props.styleProperties.symbol.options}
          handlePropertyChange={this.props.handlePropertyChange}
          symbolOptions={SYMBOL_OPTIONS}
          isDarkMode={chrome.getUiSettingsClient().get('theme:darkMode', false)}
        />

        {this._renderFillColor()}
        <EuiSpacer size="m" />

        {lineColor}

        {lineWidth}

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

  _handleSelectedFeatureChange = selectedFeature => {
    this.setState({ selectedFeature });
  }

  render() {
    const {
      supportedFeatures,
      selectedFeature,
    } = this.state;

    if (!supportedFeatures) {
      return null;
    }

    if (supportedFeatures.length === 1) {
      switch (supportedFeatures[0]) {
        case VECTOR_SHAPE_TYPES.POINT:
          return this._renderPointProperties();
        case VECTOR_SHAPE_TYPES.LINE:
          return this._renderLineProperties();
        case VECTOR_SHAPE_TYPES.POLYGON:
          return this._renderPolygonProperties();
      }
    }

    const featureButtons = [
      {
        id: VECTOR_SHAPE_TYPES.POINT,
        label: i18n.translate('xpack.maps.vectorStyleEditor.pointLabel', {
          defaultMessage: 'Points'
        })
      },
      {
        id: VECTOR_SHAPE_TYPES.LINE,
        label: i18n.translate('xpack.maps.vectorStyleEditor.lineLabel', {
          defaultMessage: 'Lines'
        })
      },
      {
        id: VECTOR_SHAPE_TYPES.POLYGON,
        label: i18n.translate('xpack.maps.vectorStyleEditor.polygonLabel', {
          defaultMessage: 'Polygons'
        })
      }
    ];

    let styleProperties = this._renderPolygonProperties();
    if (selectedFeature === VECTOR_SHAPE_TYPES.LINE) {
      styleProperties = this._renderLineProperties();
    } else if (selectedFeature === VECTOR_SHAPE_TYPES.POINT) {
      styleProperties = this._renderPointProperties();
    }

    return (
      <Fragment>
        <EuiButtonGroup
          legend={i18n.translate('xpack.maps.vectorStyleEditor.featureTypeButtonGroupLegend', {
            defaultMessage: 'vector feature button group'
          })}
          options={featureButtons}
          idSelected={selectedFeature}
          onChange={this._handleSelectedFeatureChange}
        />

        <EuiSpacer size="m" />

        {styleProperties}
      </Fragment>
    );
  }
}
