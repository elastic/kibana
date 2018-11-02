/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { DataRequest } from './util/data_request';
import React, { Fragment } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormHelpText,
} from '@elastic/eui';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export class ALayer {

  constructor({ layerDescriptor, source, style }) {
    this._descriptor = layerDescriptor;
    this._source = source;
    this._style = style;

    if (this._descriptor.dataRequests) {
      this._dataRequests = this._descriptor.dataRequests.map(dataRequest => new DataRequest(dataRequest));
    } else {
      this._dataRequests = [];
    }
  }

  static _sanitizeSliderValue(event) {
    return parseInt(event.target.value, 10);
  }

  static getBoundDataForSource(mbMap, sourceId) {
    const mbStyle = mbMap.getStyle();
    return mbStyle.sources[sourceId].data;
  }

  static _renderZoomSliders(minZoom, maxZoom, onMinZoomChange, onMaxZoomChange) {
    // if (this.state.showAtAllZoomLevels) {
    //   return;
    // }

    return (
      <Fragment>
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
                onChange={(event) => onMinZoomChange(ALayer._sanitizeSliderValue(event))}
                showInput
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
                onChange={(event) => onMaxZoomChange(ALayer._sanitizeSliderValue(event))}
                showInput
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFormHelpText>Something here about what the numbers mean.</EuiFormHelpText>
      </Fragment>
    );
  }

  static _renderLabel(seedLabel, onLabelChange) {
    return (
      <EuiFormRow
        label="Layer display name"
      >
        <EuiFieldText
          value={seedLabel}
          onChange={(event) => {onLabelChange(event.target.value);}}
        />
      </EuiFormRow>
    );
  }


  static renderGlobalSettings({ label, onLabelChange, minZoom, maxZoom, onMinZoomChange, onMaxZoomChange }) {
    return (
      <Fragment>
        {ALayer._renderLabel(label, onLabelChange)}
        {ALayer._renderZoomSliders(minZoom, maxZoom, onMinZoomChange, onMaxZoomChange)}
      </Fragment>
    );
  }

  static createDescriptor(options) {
    const layerDescriptor = {};

    layerDescriptor.dataRequests = [];
    layerDescriptor.id = Math.random().toString(36).substr(2, 5);
    layerDescriptor.label = options.label && options.label.length > 0 ? options.label : null;
    layerDescriptor.showAtAllZoomLevels = _.get(options, 'showAtAllZoomLevels', false);
    layerDescriptor.minZoom = _.get(options, 'minZoom', 0);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', 24);
    layerDescriptor.source = options.source;
    layerDescriptor.sourceDescriptor = options.sourceDescriptor;
    layerDescriptor.visible = options.visible || true;
    layerDescriptor.temporary = options.temporary || false;
    layerDescriptor.style = options.style || {};
    return layerDescriptor;
  }

  isJoinable() {
    return false;
  }

  async getDisplayName() {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    return (await this._source.getDisplayName()) || `Layer ${this._descriptor.id}`;
  }

  getLabel() {
    return this._descriptor.label;
  }

  getIcon() {
    console.warn('Icon not available for this layer type');
  }

  getId() {
    return this._descriptor.id;
  }

  getSource() {
    return this._source;
  }

  isVisible() {
    return this._descriptor.visible;
  }

  showAtZoomLevel(zoom) {
    if (this._descriptor.showAtAllZoomLevels) {
      return true;
    }

    if (zoom >= this._descriptor.minZoom && zoom <= this._descriptor.maxZoom) {
      return true;
    }

    return false;
  }

  getMinZoom() {
    return this._descriptor.minZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxZoom;
  }

  getZoomConfig() {
    return {
      showAtAllZoomLevels: this._descriptor.showAtAllZoomLevels,
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  isTemporary() {
    return this._descriptor.temporary;
  }

  getSupportedStyles() {
    return [];
  }

  getCurrentStyle() {
    return this._style;
  }

  renderSourceDetails() {
    return this._source.renderDetails();
  }

  isLayerLoading() {
    return this._dataRequests.some(dataRequest => dataRequest.isLoading());
  }

  dataHasLoadError() {
    return this._dataRequests.some(dataRequest => dataRequest.hasLoadError());
  }

  getDataLoadError() {
    const loadErrors =  this._dataRequests.filter(dataRequest => dataRequest.hasLoadError());
    return loadErrors.join(',');//todo
  }

  toLayerDescriptor() {
    return this._descriptor;
  }

  async syncData() {
    //no-op by default
  }

  updateDueToExtent(source, meta = {}, dataFilters = {}) {
    const extentAware = source.isFilterByMapBounds();
    if (!extentAware) {
      return NO_SOURCE_UPDATE_REQUIRED;
    }

    const { buffer: previousBuffer } = meta;
    const { buffer: newBuffer } = dataFilters;

    if (!previousBuffer) {
      return SOURCE_UPDATE_REQUIRED;
    }

    if (_.isEqual(previousBuffer, newBuffer)) {
      return NO_SOURCE_UPDATE_REQUIRED;
    }

    const previousBufferGeometry = turf.bboxPolygon([
      previousBuffer.min_lon,
      previousBuffer.min_lat,
      previousBuffer.max_lon,
      previousBuffer.max_lat
    ]);
    const newBufferGeometry = turf.bboxPolygon([
      newBuffer.min_lon,
      newBuffer.min_lat,
      newBuffer.max_lon,
      newBuffer.max_lat
    ]);
    const doesPreviousBufferContainNewBuffer = turfBooleanContains(previousBufferGeometry, newBufferGeometry);
    return doesPreviousBufferContainNewBuffer && !_.get(meta, 'areResultsTrimmed', false)
      ? NO_SOURCE_UPDATE_REQUIRED
      : SOURCE_UPDATE_REQUIRED;
  }

  renderStyleEditor(style, options) {
    return style.renderEditor(options);
  }

  getSourceDataRequest() {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === 'source');
  }

}

