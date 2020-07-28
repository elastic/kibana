/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { APP_ID, APP_ICON, MAP_PATH } from '../common/constants';
import { getShowMapVisualizationTypes, getVisualizations } from './kibana_services';

export function getMapsVisTypeAlias() {
  const showMapVisualizationTypes = getShowMapVisualizationTypes();
  if (!showMapVisualizationTypes) {
    getVisualizations().hideTypes(['region_map', 'tile_map']);
  }

  const description = i18n.translate('xpack.maps.visTypeAlias.description', {
    defaultMessage: 'Create and style maps with multiple layers and indices.',
  });

  const legacyMapVisualizationWarning = i18n.translate(
    'xpack.maps.visTypeAlias.legacyMapVizWarning',
    {
      defaultMessage: `Use the Maps app instead of Coordinate Map and Region Map.
The Maps app offers more functionality and is easier to use.`,
    }
  );

  return {
    aliasApp: APP_ID,
    aliasPath: `/${MAP_PATH}`,
    name: APP_ID,
    title: i18n.translate('xpack.maps.visTypeAlias.title', {
      defaultMessage: 'Maps',
    }),
    description: showMapVisualizationTypes
      ? `${description} ${legacyMapVisualizationWarning}`
      : description,
    icon: APP_ICON,
    stage: 'production',
  };
}
