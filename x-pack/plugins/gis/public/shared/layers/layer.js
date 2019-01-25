/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { DataRequest } from './util/data_request';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export class ALayer {

  constructor({ layerDescriptor, source, style }) {
    this._descriptor = ALayer.createDescriptor(layerDescriptor);
    this._source = source;
    this._style = style;

    if (this._descriptor.dataRequests) {
      this._dataRequests = this._descriptor.dataRequests.map(dataRequest => new DataRequest(dataRequest));
    } else {
      this._dataRequests = [];
    }
  }

  static getBoundDataForSource(mbMap, sourceId) {
    const mbStyle = mbMap.getStyle();
    return mbStyle.sources[sourceId].data;
  }

  static createDescriptor(options = {}) {
    const layerDescriptor = { ...options };

    layerDescriptor.dataRequests = _.get(options, 'dataRequests', []);
    layerDescriptor.id = _.get(options, 'id', Math.random().toString(36).substr(2, 5));
    layerDescriptor.label = options.label && options.label.length > 0 ? options.label : null;
    layerDescriptor.minZoom = _.get(options, 'minZoom', 0);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', 24);
    layerDescriptor.alpha = _.get(options, 'alpha', 0.75);
    layerDescriptor.visible = _.get(options, 'visible', true);
    layerDescriptor.temporary = _.get(options, 'temporary', false);
    layerDescriptor.style = _.get(options, 'style',  {});
    return layerDescriptor;
  }

  destroy() {
    if(this._source) {
      this._source.destroy();
    }
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

  async getAttributions() {
    return await this._source.getAttributions();
  }

  getLabel() {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getIcon() {
    console.warn('Icon not available for this layer type');
  }

  getTOCDetails() {
    return null;
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

  getAlpha() {
    return this._descriptor.alpha;
  }

  getZoomConfig() {
    return {
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

  renderSourceDetails = () => {
    return this._source.renderDetails();
  };

  renderSourceSettingsEditor = ({ onChange }) => {
    return this._source.renderSourceSettingsEditor({ onChange });
  };

  isLayerLoading() {
    return this._dataRequests.some(dataRequest => dataRequest.isLoading());
  }

  dataHasLoadError() {
    return this._dataRequests.some(dataRequest => dataRequest.hasLoadError());
  }

  getDataLoadError() {
    const loadErrors =  this._dataRequests
      .filter(dataRequest => dataRequest.hasLoadError())
      .map(dataRequest => {
        return dataRequest._descriptor.dataLoadError;
      });
    return loadErrors.join(',');
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
      previousBuffer.minLon,
      previousBuffer.minLat,
      previousBuffer.maxLon,
      previousBuffer.maxLat
    ]);
    const newBufferGeometry = turf.bboxPolygon([
      newBuffer.minLon,
      newBuffer.minLat,
      newBuffer.maxLon,
      newBuffer.maxLat
    ]);
    const doesPreviousBufferContainNewBuffer = turfBooleanContains(previousBufferGeometry, newBufferGeometry);

    const isTrimmed = _.get(meta, 'areResultsTrimmed', false);
    return doesPreviousBufferContainNewBuffer && !isTrimmed
      ? NO_SOURCE_UPDATE_REQUIRED
      : SOURCE_UPDATE_REQUIRED;
  }

  renderStyleEditor(style, options) {
    return style.renderEditor(options);
  }

  getSourceDataRequest() {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === 'source');
  }

  getIndexPatternIds() {
    return  [];
  }

}

