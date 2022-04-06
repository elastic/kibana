/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';

export const featureCatalogueEntry = {
  id: 'canvas',
  title: 'Canvas',
  subtitle: i18n.translate('xpack.canvas.featureCatalogue.canvasSubtitle', {
    defaultMessage: 'Design pixel-perfect presentations.',
  }),
  description: i18n.translate('xpack.canvas.appDescription', {
    defaultMessage: 'Showcase your data in a pixel-perfect way.',
  }),
  icon: 'canvasApp',
  path: '/app/canvas',
  showOnHomePage: false,
  category: 'data' as FeatureCatalogueCategory,
  solutionId: 'kibana',
  order: 300,
};
