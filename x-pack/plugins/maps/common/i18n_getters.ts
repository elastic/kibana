/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { ES_SPATIAL_RELATIONS } from './constants';

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

export function getEsSpatialRelationLabel(spatialRelation: ES_SPATIAL_RELATIONS) {
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

export function getDataViewLabel() {
  return i18n.translate('xpack.maps.dataView.label', {
    defaultMessage: 'Data view',
  });
}

export function getDataViewSelectPlaceholder() {
  return i18n.translate('xpack.maps.dataView.selectPlacholder', {
    defaultMessage: 'Select data view',
  });
}

export function getDataViewNotFoundMessage(id: string) {
  return i18n.translate('xpack.maps.dataView.notFoundMessage', {
    defaultMessage: `Unable to find data view '{id}'`,
    values: { id },
  });
}
