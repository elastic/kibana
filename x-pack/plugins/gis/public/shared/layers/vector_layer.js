/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { VectorStyle } from './styles/vector_style';


const DEFAULT_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#f58231', '#911eb4'];
let defaultColorIndex = 0;

export class VectorLayer extends ALayer {

  static type = 'VECTOR';

  static createDescriptor(options) {
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = VectorLayer.type;
    defaultColorIndex = defaultColorIndex  % DEFAULT_COLORS.length;
    if (!options.style) {
      layerDescriptor.style = VectorStyle.createDescriptor({
        'fillColor': {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {
            color: DEFAULT_COLORS[defaultColorIndex++]
          }
        }
      });
    }
    return layerDescriptor;
  }

  getSupportedStyles() {
    return [VectorStyle];
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async getOrdinalFields() {
    //best effort to avoid PEBCAK
    const numberFields = await this._source.getNumberFieldNames();
    return numberFields;
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }

    let timeAware;
    try {
      timeAware = await this._source.isTimeAware();
    } catch (error) {
      onLoadError(error.message);
      return;
    }
    const extentAware = this._source.filterByMapBounds();
    if (!timeAware && !extentAware) {
      if (this._descriptor.data || this._descriptor.dataRequestToken) {
        return;
      }
    }

    // TODO do not re-fetch data if dataFilters have not changed
    // This is going to take some work since we have to consider all the combinations of what could have changed
    /*if (this._descriptor.dataMeta && this._descriptor.dataMeta.timeFilters) {
      if (dataFilters.timeFilters === this._descriptor.dataMeta.timeFilters) {
        return;
      }
    }*/

    startLoading({ timeFilters: dataFilters.timeFilters });
    try {
      const data = await this._source.getGeoJson({
        layerId: this.getId(),
        layerName: this.getDisplayName(),
      }, dataFilters);
      stopLoading(data);
    } catch(error) {
      onLoadError(error.message);
    }
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      //todo: hack, but want to get some quick visual indication for points data
      //cannot map single kibana layer to single mapbox source
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });
    }

    //todo: similar problem as OL here. keeping track of data via MB source directly
    const mbSourceAfterAdding = mbMap.getSource(this.getId());
    if (this._descriptor.data !== mbSourceAfterAdding._data) {
      //keep track of the on the data.
      mbSourceAfterAdding.setData(this._descriptor.data);
    }

    if (
      this._style.isPropertyDynamic('fillColor') ||
      this._style.isPropertyDynamic('lineColor')
    ) {
      const shouldRefresh = this._style.enrichFeatureCollectionWithScaledProps(this._descriptor.data);
      if (shouldRefresh) {
        mbSourceAfterAdding.setData(this._descriptor.data);
      }
    }

    let isPointsOnly = true;
    if (this._descriptor.data) {
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        if (this._descriptor.data.features[i].geometry.type !== 'Point') {
          isPointsOnly = false;
          break;
        }
      }
    } else {
      isPointsOnly = false;
    }

    if (isPointsOnly) {
      const pointLayerId = this.getId() +  '_circle';
      this._style.setMBPaintPropertiesForPoints(mbMap, this.getId(), pointLayerId, this.isTemporary());
      mbMap.setLayoutProperty(pointLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
      if (!this._descriptor.showAtAllZoomLevels) {
        mbMap.setLayerZoomRange(pointLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
      }
      return;
    }

    const fillLayerId = this.getId() +  '_fill';
    const strokeLayerId = this.getId() +  '_line';
    this._style.setMBPaintProperties(mbMap, this.getId(), fillLayerId, strokeLayerId, this.isTemporary());
    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(strokeLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    if (!this._descriptor.showAtAllZoomLevels) {
      mbMap.setLayerZoomRange(strokeLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
      mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    }
  }

  renderStyleEditor(style, options) {
    return style.renderEditor({
      layer: this,
      ...options
    });
  }

}
