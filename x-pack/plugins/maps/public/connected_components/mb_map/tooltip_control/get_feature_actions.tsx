/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Polygon } from 'geojson';
import React from 'react';
import type { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import { GEO_JSON_TYPE, SOURCE_TYPES } from '../../../../common/constants';
import { TooltipFeatureAction } from '../../../../common/descriptor_types';
import { buildGeoGridFilter } from '../../../../common/elasticsearch_util';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { ESGeoGridSource } from '../../../classes/sources/es_geo_grid_source';
import { ESSearchSource } from '../../../classes/sources/es_search_source';
import { FeatureGeometryFilterForm } from './features_tooltip';

const CLUSTER_FILTER_ACTION = 'CLUSTER_FILTER_ACTION';
const GEOMETRY_FILTER_ACTION = 'GEOMETRY_FILTER_ACTION';

export function getFeatureActions({
  addFilters,
  featureId,
  geoFieldNames,
  getActionContext,
  getFilterActions,
  layer,
  mbFeature,
  onClose,
}: {
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  featureId: string;
  geoFieldNames: string[];
  getActionContext?: () => ActionExecutionContext;
  getFilterActions?: () => Promise<Action[]>;
  layer: IVectorLayer;
  mbFeature: MapGeoJSONFeature;
  onClose: () => void;
}): TooltipFeatureAction[] {
  if (geoFieldNames.length === 0 || addFilters === null) {
    return [];
  }

  const source = layer.getSource();
  if (source.getType() === SOURCE_TYPES.ES_GEO_GRID) {
    return [
      {
        label: i18n.translate('xpack.maps.tooltip.action.filterByClusterLabel', {
          defaultMessage: 'Filter by cluster',
        }),
        id: CLUSTER_FILTER_ACTION,
        onClick: () => {
          const geoGridFilter = buildGeoGridFilter({
            geoFieldNames,
            gridId: featureId, // featureId is grid id for ES_GEO_GRID source
            isHex: (source as ESGeoGridSource).isHex(),
          });
          addFilters([geoGridFilter], ACTION_GLOBAL_APPLY_FILTER);
          onClose();
        },
      },
    ];
  }

  const isPolygon =
    mbFeature.geometry.type === GEO_JSON_TYPE.POLYGON ||
    mbFeature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON;
  if (!isPolygon) {
    return [];
  }

  if (source.getType() === SOURCE_TYPES.ES_SEARCH) {
    return [
      {
        label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
          defaultMessage: 'Filter by geometry',
        }),
        id: GEOMETRY_FILTER_ACTION,
        form: (
          <FeatureGeometryFilterForm
            onClose={onClose}
            geoFieldNames={geoFieldNames}
            addFilters={addFilters}
            getFilterActions={getFilterActions}
            getActionContext={getActionContext}
            loadPreIndexedShape={async () => {
              return (source as ESSearchSource).getPreIndexedShape(mbFeature.properties);
            }}
          />
        ),
      },
    ];
  }

  if (source.isMvt()) {
    // It is not possible to filter by geometry for vector tiles because there is no way to get original geometry
    // mbFeature.geometry may not be the original geometry, it has been simplified and trimmed to tile bounds
    return [];
  }

  const geojsonFeature = layer.getFeatureById(featureId);
  return geojsonFeature
    ? [
        {
          label: i18n.translate('xpack.maps.tooltip.action.filterByGeometryLabel', {
            defaultMessage: 'Filter by geometry',
          }),
          id: GEOMETRY_FILTER_ACTION,
          form: (
            <FeatureGeometryFilterForm
              onClose={onClose}
              geoFieldNames={geoFieldNames}
              addFilters={addFilters}
              getFilterActions={getFilterActions}
              getActionContext={getActionContext}
              geometry={geojsonFeature.geometry as Polygon}
            />
          ),
        },
      ]
    : [];
}
