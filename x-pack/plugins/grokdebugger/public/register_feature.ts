/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';

export const registerFeature = (homePlugin: HomePublicPluginSetup) => {
  homePlugin.featureCatalogue.register({
    id: 'grokdebugger',
    title: i18n.translate('xpack.grokDebugger.registryProviderTitle', {
      defaultMessage: 'Grok Debugger',
    }),
    description: i18n.translate('xpack.grokDebugger.registryProviderDescription', {
      defaultMessage: 'Simulate and debug grok patterns for data transformation on ingestion.',
    }),
    icon: 'grokApp',
    path: '/app/dev_tools#/grokdebugger',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN,
  });
};
