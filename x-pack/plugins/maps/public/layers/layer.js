/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import React from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { DataRequest } from './util/data_request';
import {
  MAX_ZOOM,
  MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER,
  MIN_ZOOM,
  SOURCE_DATA_ID_ORIGIN,
} from '../../common/constants';
import uuid from 'uuid/v4';

import { copyPersistentState } from '../reducers/util.js';
import { i18n } from '@kbn/i18n';

export class AbstractLayer {
  constructor({ layerDescriptor, source }) {
    this._descriptor = AbstractLayer.createDescriptor(layerDescriptor);
    this._source = source;
    if (this._descriptor.__dataRequests) {
      this._dataRequests = this._descriptor.__dataRequests.map(
        dataRequest => new DataRequest(dataRequest)
      );
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
    layerDescriptor.minZoom = _.get(options, 'minZoom', MIN_ZOOM);
    layerDescriptor.maxZoom = _.get(options, 'maxZoom', MAX_ZOOM);
    layerDescriptor.alpha = _.get(options, 'alpha', 0.75);
    layerDescriptor.visible = _.get(options, 'visible', true);
    layerDescriptor.style = _.get(options, 'style', {});

    return layerDescriptor;
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
  }

  async cloneDescriptor() {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this.getSource().cloneDescriptor();
    if (clonedDescriptor.joins) {
      clonedDescriptor.joins.forEach(joinDescriptor => {
        // right.id is uuid used to track requests in inspector
        joinDescriptor.right.id = uuid();
      });
    }
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix) {
    return `${this.getId()}${MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER}${layerNameSuffix}`;
  }

  isJoinable() {
    return this.getSource().isJoinable();
  }

  supportsElasticsearchFilters() {
    return this.getSource().isESSource();
  }

  async supportsFitToBounds() {
    return await this.getSource().supportsFitToBounds();
  }

  async getDisplayName(source) {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    const sourceDisplayName = source
      ? await source.getDisplayName()
      : await this.getSource().getDisplayName();
    return sourceDisplayName || `Layer ${this._descriptor.id}`;
  }

  async getAttributions() {
    if (!this.hasErrors()) {
      return await this.getSource().getAttributions();
    }
    return [];
  }

  getLabel() {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getCustomIconAndTooltipContent() {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  getIconAndTooltipContent(zoomLevel, isUsingSearch) {
    let icon;
    let tooltipContent = null;
    const footnotes = [];
    if (this.hasErrors()) {
      icon = (
        <EuiIcon
          aria-label={i18n.translate('xpack.maps.layer.loadWarningAriaLabel', {
            defaultMessage: 'Load warning',
          })}
          size="m"
          type="alert"
          color="warning"
        />
      );
      tooltipContent = this.getErrors();
    } else if (this.isLayerLoading()) {
      icon = <EuiLoadingSpinner size="m" />;
    } else if (!this.isVisible()) {
      icon = <EuiIcon size="m" type="eyeClosed" />;
      tooltipContent = i18n.translate('xpack.maps.layer.layerHiddenTooltip', {
        defaultMessage: `Layer is hidden.`,
      });
    } else if (!this.showAtZoomLevel(zoomLevel)) {
      const minZoom = this.getMinZoom();
      const maxZoom = this.getMaxZoom();
      icon = <EuiIcon size="m" type="expand" />;
      tooltipContent = i18n.translate('xpack.maps.layer.zoomFeedbackTooltip', {
        defaultMessage: `Layer is visible between zoom levels {minZoom} and {maxZoom}.`,
        values: { minZoom, maxZoom },
      });
    } else {
      const customIconAndTooltipContent = this.getCustomIconAndTooltipContent();
      if (customIconAndTooltipContent) {
        icon = customIconAndTooltipContent.icon;
        if (!customIconAndTooltipContent.areResultsTrimmed) {
          tooltipContent = customIconAndTooltipContent.tooltipContent;
        } else {
          footnotes.push({
            icon: <EuiIcon color="subdued" type="partial" size="s" />,
            message: customIconAndTooltipContent.tooltipContent,
          });
        }
      }

      if (isUsingSearch && this.getQueryableIndexPatternIds().length) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="filter" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingSearchMsg', {
            defaultMessage: 'Results narrowed by search bar',
          }),
        });
      }
    }

    return {
      icon,
      tooltipContent,
      footnotes,
    };
  }

  async hasLegendDetails() {
    return false;
  }

  renderLegendDetails() {
    return null;
  }

  getId() {
    return this._descriptor.id;
  }

  getSource() {
    return this._source;
  }

  getSourceForEditing() {
    return this._source;
  }

  isVisible() {
    return this._descriptor.visible;
  }

  showAtZoomLevel(zoom) {
    return zoom >= this.getMinZoom() && zoom <= this.getMaxZoom();
  }

  getMinZoom() {
    return this._descriptor.minZoom;
  }

  getMaxZoom() {
    return this._descriptor.maxZoom;
  }

  getMinSourceZoom() {
    return this._source.getMinZoom();
  }

  _requiresPrevSourceCleanup() {
    return false;
  }

  _removeStaleMbSourcesAndLayers(mbMap) {
    if (this._requiresPrevSourceCleanup(mbMap)) {
      const mbStyle = mbMap.getStyle();
      mbStyle.layers.forEach(mbLayer => {
        if (this.ownsMbLayerId(mbLayer.id)) {
          mbMap.removeLayer(mbLayer.id);
        }
      });
      Object.keys(mbStyle.sources).some(mbSourceId => {
        if (this.ownsMbSourceId(mbSourceId)) {
          mbMap.removeSource(mbSourceId);
        }
      });
    }
  }

  getAlpha() {
    return this._descriptor.alpha;
  }

  getQuery() {
    return this._descriptor.query;
  }

  getCurrentStyle() {
    return this._style;
  }

  getStyleForEditing() {
    return this._style;
  }

  async getImmutableSourceProperties() {
    return this.getSource().getImmutableProperties();
  }

  renderSourceSettingsEditor = ({ onChange }) => {
    return this.getSourceForEditing().renderSourceSettingsEditor({ onChange });
  };

  getPrevRequestToken(dataId) {
    const prevDataRequest = this.getDataRequest(dataId);
    if (!prevDataRequest) {
      return;
    }

    return prevDataRequest.getRequestToken();
  }

  getInFlightRequestTokens() {
    if (!this._dataRequests) {
      return [];
    }

    const requestTokens = this._dataRequests.map(dataRequest => dataRequest.getRequestToken());
    return _.compact(requestTokens);
  }

  getSourceDataRequest() {
    return this.getDataRequest(SOURCE_DATA_ID_ORIGIN);
  }

  getDataRequest(id) {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === id);
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

  ownsMbLayerId() {
    throw new Error('Should implement AbstractLayer#ownsMbLayerId');
  }

  ownsMbSourceId() {
    throw new Error('Should implement AbstractLayer#ownsMbSourceId');
  }

  canShowTooltip() {
    return false;
  }

  syncLayerWithMB() {
    throw new Error('Should implement AbstractLayer#syncLayerWithMB');
  }

  getLayerTypeIconName() {
    throw new Error('should implement Layer#getLayerTypeIconName');
  }

  isDataLoaded() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest && sourceDataRequest.hasData();
  }

  async getBounds(/* mapFilters: MapFilters */) {
    return {
      minLon: -180,
      maxLon: 180,
      minLat: -89,
      maxLat: 89,
    };
  }

  renderStyleEditor({ onStyleDescriptorChange }) {
    const style = this.getStyleForEditing();
    if (!style) {
      return null;
    }
    return style.renderEditor({ layer: this, onStyleDescriptorChange });
  }

  getIndexPatternIds() {
    return [];
  }

  getQueryableIndexPatternIds() {
    return [];
  }

  syncVisibilityWithMb(mbMap, mbLayerId) {
    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
  }

  getType() {
    return this._descriptor.type;
  }
}
