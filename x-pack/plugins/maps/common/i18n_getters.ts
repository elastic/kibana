/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { $Values } from '@kbn/utility-types';
import { ES_SPATIAL_RELATIONS } from './constants';

export const UPTO = i18n.translate('xpack.maps.upto', {
  defaultMessage: 'up to',
});

export const GREAT_THAN = i18n.translate('xpack.maps.greatThan', {
  defaultMessage: 'greater than',
});

export function getAppTitle() {
  return i18n.translate('xpack.maps.appTitle', {
    defaultMessage: 'Maps',
  });
}

export function getMapEmbeddableDisplayName() {
  return i18n.translate('xpack.maps.embeddableDisplayName', {
    defaultMessage: 'map',
  });
}

export function getDataSourceLabel() {
  return i18n.translate('xpack.maps.source.dataSourceLabel', {
    defaultMessage: 'Data source',
  });
}

export function getUrlLabel() {
  return i18n.translate('xpack.maps.source.urlLabel', {
    defaultMessage: 'Url',
  });
}

export function getEsSpatialRelationLabel(spatialRelation: $Values<typeof ES_SPATIAL_RELATIONS>) {
  switch (spatialRelation) {
    case ES_SPATIAL_RELATIONS.INTERSECTS:
      return i18n.translate('xpack.maps.common.esSpatialRelation.intersectsLabel', {
        defaultMessage: 'intersects',
      });
    case ES_SPATIAL_RELATIONS.DISJOINT:
      return i18n.translate('xpack.maps.common.esSpatialRelation.disjointLabel', {
        defaultMessage: 'disjoint',
      });
    case ES_SPATIAL_RELATIONS.WITHIN:
      return i18n.translate('xpack.maps.common.esSpatialRelation.withinLabel', {
        defaultMessage: 'within',
      });
    // @ts-ignore
    case ES_SPATIAL_RELATIONS.CONTAINS:
      return i18n.translate('xpack.maps.common.esSpatialRelation.containsLabel', {
        defaultMessage: 'contains',
      });
    default:
      return spatialRelation;
  }
}
