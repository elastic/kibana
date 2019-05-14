/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import { DataRequest } from './util/data_request';
import { SOURCE_DATA_ID_ORIGIN } from '../../../common/constants';
import uuid from 'uuid/v4';
import { copyPersistentState } from '../../store/util';

const SOURCE_UPDATE_REQUIRED = true;
const NO_SOURCE_UPDATE_REQUIRED = false;

export class AbstractLayer {

  constructor({ layerDescriptor, source, style }) {
    this._descriptor = AbstractLayer.createDescriptor(layerDescriptor);
    this._source = source;
    this._style = style;
    if (this._descriptor.__dataRequests) {
      this._dataRequests = this._descriptor.__dataRequests.map(dataRequest => new DataRequest(dataRequest));
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

    layerDescriptor.__dataRequests = _.get(options, '__dataRequests', []);
    layerDescriptor.id = _.get(options, 'id', uuid());
    layerDescriptor.label = options.label && options.label.length > 0 ? options.label : null;
    layerDescriptor.minZoom = _.get(options, 'minZoom', 0);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', 24);
    layerDescriptor.alpha = _.get(options, 'alpha', 0.75);
    layerDescriptor.visible = _.get(options, 'visible', true);
    layerDescriptor.applyGlobalQuery = _.get(options, 'applyGlobalQuery', true);
    layerDescriptor.style = _.get(options, 'style',  {});

    return layerDescriptor;
  }

  destroy() {
    if(this._source) {
      this._source.destroy();
    }
  }

  async cloneDescriptor() {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this._source.cloneDescriptor();
    if (clonedDescriptor.joins) {
      clonedDescriptor.joins.forEach(joinDescriptor => {
        // right.id is uuid used to track requests in inspector
        joinDescriptor.right.id = uuid();
      });
    }
    return clonedDescriptor;
  }

  isJoinable() {
    return this._source.isJoinable();
  }

  supportsElasticsearchFilters() {
    return this._source.supportsElasticsearchFilters();
  }

  async supportsFitToBounds() {
    return await this._source.supportsFitToBounds();
  }

  async getDisplayName() {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    return (await this._source.getDisplayName()) || `Layer ${this._descriptor.id}`;
  }

  async getAttributions() {
    if (!this.hasErrors()) {
      return await this._source.getAttributions();
    }
    return [];
  }

  getLabel() {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getIcon() {
    console.warn('Icon not available for this layer type');
  }

  hasLegendDetails() {
    return false;
  }

  getLegendDetails() {
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

  getQuery() {
    return this._descriptor.query;
  }

  getApplyGlobalQuery() {
    return this._descriptor.applyGlobalQuery;
  }

  getZoomConfig() {
    return {
      minZoom: this._descriptor.minZoom,
      maxZoom: this._descriptor.maxZoom,
    };
  }

  getCurrentStyle() {
    return this._style;
  }

  async getImmutableSourceProperties() {
    return this._source.getImmutableProperties();
  }

  renderSourceSettingsEditor = ({ onChange }) => {
    return this._source.renderSourceSettingsEditor({ onChange });
  };

  getSourceDataRequest() {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === SOURCE_DATA_ID_ORIGIN);
  }

  isLayerLoading() {
    return this._dataRequests.some(dataRequest => dataRequest.isLoading());
  }

  hasErrors() {
    return _.get(this._descriptor, '__isInErrorState', false);
  }

  getErrors() {
    return this.hasErrors() ? this._descriptor.__errorMessage : '';
  }

  toLayerDescriptor() {
    return this._descriptor;
  }

  async syncData() {
    //no-op by default
  }

  getMbLayerIds() {
    throw new Error('Should implement AbstractLayer#getMbLayerIds');
  }

  canShowTooltip() {
    return false;
  }

  syncLayerWithMb() {
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

  getLayerTypeIconName() {
    throw new Error('should implement Layer#getLayerTypeIconName');
  }

  async getBounds() {
    return {
      min_lon: -180,
      max_lon: 180,
      min_lat: -89,
      max_lat: 89
    };
  }

  renderStyleEditor({ onStyleDescriptorChange }) {
    return this._style.renderEditor({ layer: this, onStyleDescriptorChange });
  }

  getIndexPatternIds() {
    return  [];
  }

  getQueryableIndexPatternIds() {
    if (this.getApplyGlobalQuery()) {
      return this.getIndexPatternIds();
    }

    return [];
  }

  async getOrdinalFields() {
    return [];
  }

}

