/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { DATASET_QUALITY_APP_ID } from '../common/constants';
import { datasetQualityAppTitle } from '../common/translations';
import { createDatasetQuality } from './components/dataset_quality';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
  DatasetQualitySetupDeps,
  DatasetQualityStartDeps,
} from './types';

export class DatasetQualityPlugin
  implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart>
{
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DatasetQualitySetupDeps) {
    // TODO: remove this registeration after local tesing is done
    const DatasetQuality = createDatasetQuality({
      core,
      plugins,
    });
    core.application.register({
      id: DATASET_QUALITY_APP_ID,
      title: datasetQualityAppTitle,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoLogging',
      navLinkStatus: AppNavLinkStatus.visible,
      searchable: true,
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(<DatasetQuality />, element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: DatasetQualityStartDeps): DatasetQualityPluginStart {
    const DatasetQuality = createDatasetQuality({
      core,
      plugins,
    });

    return { DatasetQuality };
  }
}
