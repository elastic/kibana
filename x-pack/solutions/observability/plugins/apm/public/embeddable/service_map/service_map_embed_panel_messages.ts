/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Default height for service map embed panels (alert details, service overview, etc.). */
export const SERVICE_MAP_EMBED_PANEL_HEIGHT = 400;

export const SERVICE_MAP_EMBED_PANEL_TITLE = i18n.translate(
  'xpack.apm.serviceMapEmbeddable.panelTitle',
  { defaultMessage: 'Service map' }
);

export const SERVICE_MAP_EMBED_PANEL_PREVIEW_TITLE = i18n.translate(
  'xpack.apm.serviceMapEmbeddable.panelPreviewTitle',
  { defaultMessage: 'Service map preview' }
);

export const EXPLORE_IN_SERVICE_MAP_LABEL = i18n.translate(
  'xpack.apm.serviceMapEmbeddable.exploreInServiceMap',
  { defaultMessage: 'Explore in Service map' }
);
