/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This file contains constants included in page load bundle size.
 * Keep this file as small as possible to avoid bloating page load bundle size
 */

import { i18n } from '@kbn/i18n';

export const INITIAL_LAYERS_KEY = 'initialLayers';
export const MAP_SAVED_OBJECT_TYPE = 'map';
export const APP_ID = 'maps';
export const APP_ICON = 'gisApp';
export const MAP_PATH = 'map';

export const APP_NAME = i18n.translate('xpack.maps.appTitle', {
  defaultMessage: 'Maps',
});

export function getEditPath(id: string | undefined) {
  return id ? `/${MAP_PATH}/${id}` : `/${MAP_PATH}`;
}

export const GEOJSON_FEATURE_ID_PROPERTY_NAME = '__kbn__feature_id__';
