/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { FileDataVisualizerWrapper } from './lazy_load_bundle/component_wrapper';
import {
  featureTitle,
  FILE_DATA_VIS_TAB_ID,
  applicationPath,
  featureId,
} from '../common/constants';

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
    id: featureId,
    title: featureTitle,
    description: i18n.translate('xpack.dataVisualizer.description', {
      defaultMessage: 'Import your own CSV, NDJSON, or log file.',
    }),
    icon: 'document',
    path: applicationPath,
    showOnHomePage: true,
    category: 'data',
    order: 520,
  });
}
