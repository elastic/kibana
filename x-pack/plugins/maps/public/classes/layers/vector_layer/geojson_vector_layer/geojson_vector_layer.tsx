/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';
import { Feature, FeatureCollection } from 'geojson';
import type { Map as MbMap, GeoJSONSource as MbGeoJSONSource } from '@kbn/mapbox-gl';
import {
  EMPTY_FEATURE_COLLECTION,
  FEATURE_VISIBLE_PROPERTY_NAME,
  LAYER_TYPE,
} from '../../../../../common/constants';
import {
  StyleMetaDescriptor,
  Timeslice,
  VectorLayerDescriptor,
} from '../../../../../common/descriptor_types';
import { TimesliceMaskConfig } from '../../../util/mb_filter_expressions';
import { DataRequestContext } from '../../../../actions';
import { IVectorStyle, VectorStyle } from '../../../styles/vector/vector_style';
import { ISource } from '../../../sources/source';
import { IVectorSource } from '../../../sources/vector_source';
import { AbstractLayer, LayerIcon } from '../../layer';
import {
  AbstractVectorLayer,
  noResultsIcon,
  NO_RESULTS_ICON_AND_TOOLTIPCONTENT,
} from '../vector_layer';
import { DataRequestAbortError } from '../../../util/data_request';
import { getFeatureCollectionBounds } from '../../../util/get_feature_collection_bounds';
import { GEOJSON_FEATURE_ID_PROPERTY_NAME } from './assign_feature_ids';
import { syncGeojsonSourceData } from './geojson_source_data';
import { performInnerJoins } from './perform_inner_joins';
import { pluckStyleMetaFromFeatures } from './pluck_style_meta_from_features';

export class GeoJsonVectorLayer extends AbstractVectorLayer {
  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(options) as VectorLayerDescriptor;
    layerDescriptor.type = LAYER_TYPE.GEOJSON_VECTOR;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    if (!options.joins) {
      layerDescriptor.joins = [];
    }

    return layerDescriptor;
  }

  async getBounds(syncContext: DataRequestContext) {
    const isStaticLayer = !this.getSource().isBoundsAware();
    return isStaticLayer || this.hasJoins()
      ? getFeatureCollectionBounds(this._getSourceFeatureCollection(), this.hasJoins())
      : super.getBounds(syncContext);
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    const featureCollection = this._getSourceFeatureCollection();

    if (!featureCollection || featureCollection.features.length === 0) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    if (
      this.getJoins().length &&
      !featureCollection.features.some(
        (feature) => feature.properties?.[FEATURE_VISIBLE_PROPERTY_NAME]
      )
    ) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundInJoinTooltip', {
          defaultMessage: `No matching results found in term joins`,
        }),
      };
    }

    const sourceDataRequest = this.getSourceDataRequest();
    const { tooltipContent, areResultsTrimmed, isDeprecated } =
      this.getSource().getSourceStatus(sourceDataRequest);
    return {
      icon: isDeprecated ? (
        <EuiIcon type="alert" color="danger" />
      ) : (
        this.getCurrentStyle().getIcon(isTocIcon && areResultsTrimmed)
      ),
      tooltipContent,
      areResultsTrimmed,
    };
  }

  getFeatureId(feature: Feature): string | number | undefined {
    return feature.properties?.[GEOJSON_FEATURE_ID_PROPERTY_NAME];
  }

  getFeatureById(id: string | number) {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return null;
    }

    const targetFeature = featureCollection.features.find((feature) => {
      return this.getFeatureId(feature) === id;
    });
    return targetFeature ? targetFeature : null;
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    const sourceDataRequest = this.getSourceDataRequest();
    const style = this.getCurrentStyle();
    if (!style || !sourceDataRequest) {
      return null;
    }

    this.getSource(), this.getCurrentStyle()

    return await pluckStyleMetaFromFeatures(
      _.get(sourceDataRequest.getData(), 'features', []),
      await this.getSource().getSupportedShapeTypes(),
      this.getCurrentStyle().getDynamicPropertiesArray(),
    );
  }

  _requiresPrevSourceCleanup(mbMap: MbMap) {
    const mbSource = mbMap.getSource(this.getMbSourceId());
    if (!mbSource) {
      return false;
    }

    return mbSource.type !== 'geojson';
  }

  syncLayerWithMB(mbMap: MbMap, timeslice?: Timeslice) {
    this._removeStaleMbSourcesAndLayers(mbMap);

    const mbSourceId = this.getMbSourceId();
    const mbSource = mbMap.getSource(mbSourceId);
    if (!mbSource) {
      mbMap.addSource(mbSourceId, {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      });
    }

    this._syncFeatureCollectionWithMb(mbMap);

    const timesliceMaskConfig = this._getTimesliceMaskConfig(timeslice);
    this._setMbLabelProperties(mbMap, undefined, timesliceMaskConfig);
    this._setMbPointsProperties(mbMap, undefined, timesliceMaskConfig);
    this._setMbLinePolygonProperties(mbMap, undefined, timesliceMaskConfig);
  }

  _syncFeatureCollectionWithMb(mbMap: MbMap) {
    const mbGeoJSONSource = mbMap.getSource(this.getId()) as MbGeoJSONSource;
    const featureCollection = this._getSourceFeatureCollection();
    const featureCollectionOnMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());

    if (!featureCollection) {
      if (featureCollectionOnMap) {
        this.getCurrentStyle().clearFeatureState(featureCollectionOnMap, mbMap, this.getId());
      }
      mbGeoJSONSource.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    // "feature-state" data expressions are not supported with layout properties.
    // To work around this limitation,
    // scaled layout properties (like icon-size) must fall back to geojson property values :(
    const hasGeoJsonProperties = this.getCurrentStyle().setFeatureStateAndStyleProps(
      featureCollection,
      mbMap,
      this.getId()
    );
    if (featureCollection !== featureCollectionOnMap || hasGeoJsonProperties) {
      mbGeoJSONSource.setData(featureCollection);
    }
  }

  _getTimesliceMaskConfig(timeslice?: Timeslice): TimesliceMaskConfig | undefined {
    if (!timeslice || this.hasJoins()) {
      return;
    }

    const prevMeta = this.getSourceDataRequest()?.getMeta();
    return prevMeta !== undefined && prevMeta.timesliceMaskField !== undefined
      ? {
          timesliceMaskField: prevMeta.timesliceMaskField,
          timeslice,
        }
      : undefined;
  }

  async syncData(syncContext: DataRequestContext) {
    await this._syncData(syncContext, this.getSource(), this.getCurrentStyle());
  }

  // TLDR: Do not call getSource or getCurrentStyle in syncData flow. Use 'source' and 'style' arguments instead.
  //
  // 1) State is contained in the redux store. Layer instance state is readonly.
  // 2) Even though data request descriptor updates trigger new instances for rendering,
  // syncing data executes on a single object instance. Syncing data can not use updated redux store state.
  //
  // Blended layer data syncing branches on the source/style depending on whether clustering is used or not.
  // Given 1 above, which source/style to use can not be stored in Layer instance state.
  // Given 2 above, which source/style to use can not be pulled from data request state.
  // Therefore, source and style are provided as arugments and must be used instead of calling getSource or getCurrentStyle.
  async _syncData(syncContext: DataRequestContext, source: IVectorSource, style: IVectorStyle) {
    if (this.isLoadingBounds()) {
      return;
    }

    try {
      await this._syncSourceStyleMeta(syncContext, source, style);
      await this._syncSourceFormatters(syncContext, source, style);
      const sourceResult = await syncGeojsonSourceData({
        layerId: this.getId(),
        layerName: await this.getDisplayName(source),
        prevDataRequest: this.getSourceDataRequest(),
        requestMeta: await this._getVectorSourceRequestMeta(
          syncContext.isForceRefresh,
          syncContext.dataFilters,
          source,
          style
        ),
        syncContext,
        source,
        getUpdateDueToTimeslice: (timeslice?: Timeslice) => {
          return this._getUpdateDueToTimesliceFromSourceRequestMeta(source, timeslice);
        },
      });
      await this._syncSupportsFeatureEditing({ syncContext, source });
      if (
        !sourceResult.featureCollection ||
        !sourceResult.featureCollection.features.length ||
        !this.hasJoins()
      ) {
        return;
      }

      const joinStates = await this._syncJoins(syncContext, style);
      await performInnerJoins(
        sourceResult,
        joinStates,
        syncContext.updateSourceData,
        syncContext.onJoinError
      );
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        throw error;
      }
    }
  }

  _getSourceFeatureCollection() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? (sourceDataRequest.getData() as FeatureCollection) : null;
  }

  _getUpdateDueToTimesliceFromSourceRequestMeta(source: ISource, timeslice?: Timeslice) {
    const prevDataRequest = this.getSourceDataRequest();
    const prevMeta = prevDataRequest?.getMeta();
    if (!prevMeta) {
      return true;
    }
    return source.getUpdateDueToTimeslice(prevMeta, timeslice);
  }
}
