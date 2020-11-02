/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';

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
  category: FeatureCatalogueCategory.DATA,
  solutionId: 'kibana',
  order: 300,
};
