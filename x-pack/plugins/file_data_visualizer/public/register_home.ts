/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { FileDataVisualizerWrapper } from './lazy_load_bundle/component_wrapper';

const PLUGIN_ID = 'fileDataViz';

export function registerHomeAddData(home: HomePublicPluginSetup) {
  home.addData.registerAddDataTab({
    id: PLUGIN_ID,
    name: i18n.translate('xpack.fileDataVisualizer.embeddedTabTitle', {
      defaultMessage: 'Upload file',
    }),
    component: FileDataVisualizerWrapper,
  });

  home.featureCatalogue.register({
    id: PLUGIN_ID,
    title: i18n.translate('xpack.fileDataVisualizer.fileDataVisualizerTitle', {
      defaultMessage: 'Upload a file',
    }),
    description: i18n.translate('xpack.fileDataVisualizer.fileDataVisualizerDescription', {
      defaultMessage: 'Import your own CSV, NDJSON, or log file.',
    }),
    icon: 'document',
    path: '/app/home#/tutorial_directory',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
    order: 520,
  });
}
