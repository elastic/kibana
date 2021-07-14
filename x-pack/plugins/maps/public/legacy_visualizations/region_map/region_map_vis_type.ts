/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeDefinition } from '../../../../../../src/plugins/visualizations/public';
import { toExpressionAst } from './to_ast';
import { RegionMapVisParams } from './types';
import { RegionMapEditor } from './region_map_editor';

export const title = i18n.translate('xpack.maps.regionMapMap.vis.title', {
  defaultMessage: 'Region Map',
});

export const regionMapVisType = {
  name: 'region_map',
  title,
  icon: 'visMapRegion',
  description: i18n.translate('xpack.maps.regionMap.vis.description', {
    defaultMessage:
      'Show metrics on a thematic map. Use one of the \
provided base maps, or add your own. Darker colors represent higher values.',
  }),
  editorConfig: {
    optionTabs: [
      {
        name: '',
        title: '',
        editor: RegionMapEditor,
      },
    ],
  },
  visConfig: {
    defaults: {
      colorSchema: 'Yellow to Red',
      mapZoom: 2,
      mapCenter: [0, 0],
    },
  },
  toExpressionAst,
  requiresSearch: true,
} as VisTypeDefinition<RegionMapVisParams>;
