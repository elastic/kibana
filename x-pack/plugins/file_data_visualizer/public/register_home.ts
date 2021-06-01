/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { FileDataVisualizerWrapper } from './lazy_load_bundle/component_wrapper';

export function registerHomeAddData(home: HomePublicPluginSetup) {
  home.addData.registerAddDataTab({
    id: 'fileDataViz',
    name: i18n.translate('xpack.fileDataVisualizer.embeddedTabTitle', {
      defaultMessage: 'Upload file',
    }),
    component: FileDataVisualizerWrapper,
  });
}
