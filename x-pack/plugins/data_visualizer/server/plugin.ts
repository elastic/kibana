/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { StartDeps, SetupDeps } from './types';
import { dataVisualizerRoutes } from './routes';

const FILE_DATA_VIS_TAB_ID = 'fileDataViz';

export class DataVisualizerPlugin implements Plugin {
  constructor() {}

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    dataVisualizerRoutes(coreSetup);

    // home-plugin required
    if (plugins.home && plugins.customIntegrations) {
      plugins.customIntegrations.registerCustomIntegration({
        id: 'file_data_visualizer',
        title: i18n.translate('xpack.dataVisualizer.title', {
          defaultMessage: 'Upload a file',
        }),
        description: i18n.translate('xpack.dataVisualizer.description', {
          defaultMessage: 'Import your own CSV, NDJSON, or log file.',
        }),
        uiInternalPath: `/app/home#/tutorial_directory/${FILE_DATA_VIS_TAB_ID}`,
        isBeta: false,
        icons: [
          {
            type: 'eui',
            src: 'addDataApp',
          },
        ],
        categories: ['upload_file'],
        shipper: 'add_data',
      });
    }
  }

  start(core: CoreStart) {}
}
