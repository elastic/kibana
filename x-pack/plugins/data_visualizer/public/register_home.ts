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

const FILE_DATA_VIS_TAB_ID = 'fileDataViz';

export function registerHomeAddData(home: HomePublicPluginSetup) {
  home.addData.registerAddDataTab({
    id: FILE_DATA_VIS_TAB_ID,
    name: i18n.translate('xpack.dataVisualizer.file.embeddedTabTitle', {
      defaultMessage: 'Upload file',
    }),
    component: FileDataVisualizerWrapper,
  });
}

export function registerHomeFeatureCatalogue(home: HomePublicPluginSetup) {
  home.featureCatalogue.register({
    id: `file_data_visualizer`,
    title: i18n.translate('xpack.dataVisualizer.title', {
      defaultMessage: 'Upload a file',
    }),
    description: i18n.translate('xpack.dataVisualizer.description', {
      defaultMessage: 'Import your own CSV, NDJSON, or log file.',
    }),
    icon: 'document',
    path: `/app/home#/tutorial_directory/${FILE_DATA_VIS_TAB_ID}`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA,
    order: 520,
  });
}
