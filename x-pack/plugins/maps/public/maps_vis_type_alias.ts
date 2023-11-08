/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VisualizationStage } from '@kbn/visualizations-plugin/public';
import type { MapItem } from '../common/content_management';
import {
  APP_ID,
  APP_ICON,
  APP_NAME,
  getEditPath,
  MAP_PATH,
  MAP_SAVED_OBJECT_TYPE,
} from '../common/constants';
import { getMapClient } from './content_management';

export function getMapsVisTypeAlias() {
  const appDescription = i18n.translate('xpack.maps.visTypeAlias.description', {
    defaultMessage: 'Create and style maps with multiple layers and indices.',
  });

  return {
    aliasApp: APP_ID,
    aliasPath: `/${MAP_PATH}`,
    name: APP_ID,
    title: APP_NAME,
    description: appDescription,
    icon: APP_ICON,
    stage: 'production' as VisualizationStage,
    appExtensions: {
      visualizations: {
        docTypes: [MAP_SAVED_OBJECT_TYPE],
        searchFields: ['title^3'],
        client: getMapClient,
        toListItem(mapItem: MapItem) {
          const { id, type, updatedAt, attributes } = mapItem;
          const { title, description } = attributes;

          return {
            id,
            title,
            description,
            updatedAt,
            editUrl: getEditPath(id),
            editApp: APP_ID,
            icon: APP_ICON,
            stage: 'production' as VisualizationStage,
            savedObjectType: type,
            typeTitle: APP_NAME,
          };
        },
      },
    },
  };
}
