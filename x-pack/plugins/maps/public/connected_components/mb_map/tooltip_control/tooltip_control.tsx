/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import {
  LngLat,
  Map as MbMap,
  MapboxGeoJSONFeature,
  MapMouseEvent,
  Point as MbPoint,
} from 'mapbox-gl';
import uuid from 'uuid/v4';
import { Geometry } from 'geojson';
import { Filter } from 'src/plugins/data/public';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import {
  ES_GEO_FIELD_TYPE,
  FEATURE_ID_PROPERTY_NAME,
  GEO_JSON_TYPE,
  LON_INDEX,
  RawValue,
} from '../../../../common/constants';
import {
  GEOMETRY_FILTER_ACTION,
  TooltipFeature,
  TooltipFeatureAction,
  TooltipState,
} from '../../../../common/descriptor_types';
import { TooltipPopover } from './tooltip_popover';
import { FeatureGeometryFilterForm } from './features_tooltip';
import { EXCLUDE_TOO_MANY_FEATURES_BOX } from '../../../classes/util/mb_filter_expressions';
import { ILayer } from '../../../classes/layers/layer';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';
import { RenderToolTipContent } from '../../../classes/tooltips/tooltip_property';

function justifyAnchorLocation(
  mbLngLat: LngLat,
  targetFeature: MapboxGeoJSONFeature
): [number, number] {
  let popupAnchorLocation: [number, number] = [mbLngLat.lng, mbLngLat.lat]; // default popup location to mouse location
  if (targetFeature.geometry.type === 'Point') {
    const coordinates = targetFeature.geometry.coordinates.slice() as [number, number];

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(mbLngLat.lng - coordinates[LON_INDEX]) > 180) {
      coordinates[0] += mbLngLat.lng > coordinates[LON_INDEX] ? 360 : -360;
    }

    popupAnchorLocation = coordinates;
  }
  return popupAnchorLocation;
}

function isVectorLayer(layer: ILayer) {
  return (layer as IVectorLayer).canShowTooltip !== undefined;
}

export interface Props {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  closeOnClickTooltip: (tooltipId: string) => void;
  closeOnHoverTooltip: () => void;
  getActionContext?: () => ActionExecutionContext;
  getFilterActions?: () => Promise<Action[]>;
  geoFields: GeoFieldWithIndex[];
  hasLockedTooltips: boolean;
  isDrawingFilter: boolean;
  layerList: ILayer[];
  mbMap: MbMap;
  openOnClickTooltip: (tooltipState: TooltipState) => void;
  openOnHoverTooltip: (tooltipState: TooltipState) => void;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
  openTooltips: TooltipState[];
  renderTooltipContent?: RenderToolTipContent;
}

export class TooltipControl extends Component<Props, {}> {
  componentDidMount() {
    this.props.mbMap.on('mouseout', this._onMouseout);
    this.props.mbMap.on('mousemove', this._updateHoverTooltipState);
    this.props.mbMap.on('click', this._lockTooltip);
  }

  componentWillUnmount() {
    this.props.mbMap.off('mouseout', this._onMouseout);
    this.props.mbMap.off('mousemove', this._updateHoverTooltipState);
    this.props.mbMap.off('click', this._lockTooltip);
  }

  _onMouseout = () => {
    this._updateHoverTooltipState.cancel();
    if (!this.props.hasLockedTooltips) {
      this.props.closeOnHoverTooltip();
    }
  };

  _findLayerById = (layerId: string) => {
    return this.props.layerList.find((layer) => {
      return layer.getId() === layerId && isVectorLayer(layer);
    }) as IVectorLayer;
  };

  // Must load original geometry instead of using geometry from mapbox feature.
  // Mapbox feature geometry is from vector tile and is not the same as the original geometry.
  _getFeatureGeometry = ({
    layerId,
    featureId,
  }: {
    layerId: string;
    featureId?: string | number;
  }): Geometry | null => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer || featureId === undefined) {
      return null;
    }

    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return null;
    }

    return targetFeature.geometry;
  };

  _getLayerByMbLayerId(mbLayerId: string): IVectorLayer | undefined {
    return this.props.layerList.find((layer) => {
      const mbLayerIds = layer.getMbLayerIds();
      return isVectorLayer(layer) && mbLayerIds.indexOf(mbLayerId) > -1;
    }) as IVectorLayer;
  }

  _loadPreIndexedShape = async ({ layerId, featureId }: { layerId: string; featureId: string }) => {
    const tooltipLayer = this._findLayerById(layerId);
    if (!tooltipLayer || typeof featureId === 'undefined') {
      return null;
    }

    const targetFeature = tooltipLayer.getFeatureById(featureId);
    if (!targetFeature) {
      return null;
    }

    return await tooltipLayer.getSource().getPreIndexedShape(targetFeature.properties);
  };

  _getFeatureActions({
    layerId,
    featureId,
    tooltipId,
  }: {
    layerId: string;
    featureId: string;
    tooltipId: string;
  }): TooltipFeatureAction[] {
    const actions = [];

    const geometry = this._getFeatureGeometry({ layerId, featureId });
    const geoFieldsForFeature = this._filterGeoFieldsByFeatureGeometry(geometry);
    if (geometry && geoFieldsForFeature.length && this.props.addFilters) {
      actions.push({
        label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
          defaultMessage: 'Filter by geometry',
        }),
        id: GEOMETRY_FILTER_ACTION as typeof GEOMETRY_FILTER_ACTION,
        form: (
          <FeatureGeometryFilterForm
            onClose={() => {
              this.props.closeOnClickTooltip(tooltipId);
            }}
            geometry={geometry}
            geoFields={geoFieldsForFeature}
            addFilters={this.props.addFilters}
            getFilterActions={this.props.getFilterActions}
            getActionContext={this.props.getActionContext}
            loadPreIndexedShape={async () => {
              return this._loadPreIndexedShape({ layerId, featureId });
            }}
          />
        ),
      });
    }

    return actions;
  }

  _filterGeoFieldsByFeatureGeometry(geometry: Geometry | null) {
    if (!geometry) {
      return [];
    }

    // line geometry can only create filters for geo_shape fields.
    if (
      geometry.type === GEO_JSON_TYPE.LINE_STRING ||
      geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING
    ) {
      return this.props.geoFields.filter(({ geoFieldType }) => {
        return geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE;
      });
    }

    // TODO support geo distance filters for points
    if (geometry.type === GEO_JSON_TYPE.POINT || geometry.type === GEO_JSON_TYPE.MULTI_POINT) {
      return [];
    }

    return this.props.geoFields;
  }

  _getTooltipFeatures(
    mbFeatures: MapboxGeoJSONFeature[],
    isLocked: boolean,
    tooltipId: string
  ): TooltipFeature[] {
    const uniqueFeatures: TooltipFeature[] = [];
    // there may be duplicates in the results from mapbox
    // this is because mapbox returns the results per tile
    // for polygons or lines, it might return multiple features, one for each tile
    for (let i = 0; i < mbFeatures.length; i++) {
      const mbFeature = mbFeatures[i];
      const layer = this._getLayerByMbLayerId(mbFeature.layer.id);
      if (!layer) {
        break;
      }
      const featureId = mbFeature.properties?.[FEATURE_ID_PROPERTY_NAME];
      const layerId = layer.getId();
      let match = false;
      for (let j = 0; j < uniqueFeatures.length; j++) {
        const uniqueFeature = uniqueFeatures[j];
        if (featureId === uniqueFeature.id && layerId === uniqueFeature.layerId) {
          match = true;
          break;
        }
      }
      if (!match) {
        // "tags" (aka properties) are optional in .mvt tiles.
        // It's not entirely clear how mapbox-gl handles those.
        // - As null value (as defined in https://tools.ietf.org/html/rfc7946#section-3.2)
        // - As undefined value
        // - As empty object literal
        // To avoid ambiguity, normalize properties to empty object literal.
        const mbProperties = mbFeature.properties ? mbFeature.properties : {};
        const actions: TooltipFeatureAction[] = isLocked
          ? this._getFeatureActions({ layerId, featureId, tooltipId })
          : [];

        const hasActions = isLocked && actions.length;
        if (hasActions || layer.canShowTooltip()) {
          // This keeps track of first feature (assuming these will be identical for features in different tiles)
          uniqueFeatures.push({
            id: featureId,
            layerId,
            mbProperties,
            actions,
          });
        }
      }
    }
    return uniqueFeatures;
  }

  _lockTooltip = (e: MapMouseEvent) => {
    if (this.props.isDrawingFilter) {
      // ignore click events when in draw mode
      return;
    }

    this._updateHoverTooltipState.cancel(); // ignore any possible moves

    const mbFeatures = this._getMbFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      // No features at click location so there is no tooltip to open
      return;
    }

    const targetMbFeataure = mbFeatures[0];
    const popupAnchorLocation = justifyAnchorLocation(e.lngLat, targetMbFeataure);

    const isLocked = true;
    const tooltipId = uuid();
    const features = this._getTooltipFeatures(mbFeatures, isLocked, tooltipId);
    if (features.length === 0) {
      return;
    }
    this.props.openOnClickTooltip({
      features,
      location: popupAnchorLocation,
      isLocked,
      id: tooltipId,
    });
  };

  _updateHoverTooltipState = _.debounce((e: MapMouseEvent) => {
    if (this.props.isDrawingFilter || this.props.hasLockedTooltips) {
      // ignore hover events when in draw mode or when there are locked tooltips
      return;
    }

    const mbFeatures = this._getMbFeaturesUnderPointer(e.point);
    if (!mbFeatures.length) {
      this.props.closeOnHoverTooltip();
      return;
    }

    const targetMbFeature = mbFeatures[0];
    if (this.props.openTooltips[0] && this.props.openTooltips[0].features.length) {
      const firstFeature = this.props.openTooltips[0].features[0];
      if (targetMbFeature.properties?.[FEATURE_ID_PROPERTY_NAME] === firstFeature.id) {
        // ignore hover events when hover tooltip is all ready opened for feature
        return;
      }
    }
    const popupAnchorLocation = justifyAnchorLocation(e.lngLat, targetMbFeature);

    const isLocked = false;
    const tooltipId = uuid();
    const features = this._getTooltipFeatures(mbFeatures, isLocked, tooltipId);
    if (features.length === 0) {
      return;
    }
    this.props.openOnHoverTooltip({
      features,
      location: popupAnchorLocation,
      isLocked,
      id: tooltipId,
    });
  }, 100);

  _getMbLayerIdsForTooltips() {
    const mbLayerIds: string[] = this.props.layerList.reduce(
      (accumulator: string[], layer: ILayer) => {
        // tooltips are only supported for vector layers, filter out all other layer types
        return layer.isVisible() && isVectorLayer(layer)
          ? accumulator.concat(layer.getMbLayerIds())
          : accumulator;
      },
      []
    );

    // Ensure that all layers are actually on the map.
    // The raw list may contain layer-ids that have not been added to the map yet.
    // For example:
    // a vector or heatmap layer will not add a source and layer to the mapbox-map, until that data is available.
    // during that data-fetch window, the app should not query for layers that do not exist.
    return mbLayerIds.filter((mbLayerId) => {
      return !!this.props.mbMap.getLayer(mbLayerId);
    });
  }

  _getMbFeaturesUnderPointer(mbLngLatPoint: MbPoint) {
    if (!this.props.mbMap) {
      return [];
    }

    const mbLayerIds = this._getMbLayerIdsForTooltips();
    const PADDING = 2; // in pixels
    const mbBbox = [
      {
        x: mbLngLatPoint.x - PADDING,
        y: mbLngLatPoint.y - PADDING,
      },
      {
        x: mbLngLatPoint.x + PADDING,
        y: mbLngLatPoint.y + PADDING,
      },
    ] as [MbPoint, MbPoint];
    return this.props.mbMap.queryRenderedFeatures(mbBbox, {
      layers: mbLayerIds,
      filter: EXCLUDE_TOO_MANY_FEATURES_BOX,
    });
  }

  render() {
    if (this.props.openTooltips.length === 0) {
      return null;
    }

    return this.props.openTooltips.map(({ features, location, id, isLocked }, index) => {
      const closeTooltip = isLocked
        ? () => {
            this.props.closeOnClickTooltip(id);
          }
        : this.props.closeOnHoverTooltip;
      return (
        <TooltipPopover
          key={id}
          mbMap={this.props.mbMap}
          findLayerById={this._findLayerById}
          addFilters={this.props.addFilters}
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          onSingleValueTrigger={this.props.onSingleValueTrigger}
          renderTooltipContent={this.props.renderTooltipContent}
          features={features}
          location={location}
          closeTooltip={closeTooltip}
          isLocked={isLocked}
          index={index}
          loadFeatureGeometry={this._getFeatureGeometry}
        />
      );
    });
  }
}
