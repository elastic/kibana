/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
<<<<<<< HEAD
import type { FeatureCatalogueCategory } from '@kbn/home-plugin/public';
=======
import { FeatureCatalogueCategory } from '@kbn/home-plugin/public';
>>>>>>> upstream/main

export const featureCatalogueEntry = {
  id: 'apm',
  title: 'APM',
  description: i18n.translate('xpack.apm.apmDescription', {
    defaultMessage:
      'Automatically collect in-depth performance metrics and ' +
      'errors from inside your applications.',
  }),
  icon: 'apmApp',
  path: '/app/apm',
  showOnHomePage: false,
  category: 'data' as FeatureCatalogueCategory,
};
