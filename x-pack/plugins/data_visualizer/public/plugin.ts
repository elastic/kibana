/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import { Plugin } from '@kbn/core/public';

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { SecurityPluginSetup } from '@kbn/security-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { getFileDataVisualizerComponent, getIndexDataVisualizerComponent } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';
import { registerEmbeddables } from './application/index_data_visualizer/embeddables';
import { setStartServices } from './kibana_services';
import { IndexDataVisualizerLocatorDefinition } from './application/index_data_visualizer/locator';

export interface DataVisualizerSetupDependencies {
  home?: HomePublicPluginSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  discover: DiscoverSetup;
}
export interface DataVisualizerStartDependencies {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fileUpload: FileUploadPluginStart;
  maps: MapsStartApi;
  embeddable: EmbeddableStart;
  security?: SecurityPluginSetup;
  share: SharePluginStart;
  discover: DiscoverStart;
  lens?: LensPublicStart;
  charts: ChartsPluginStart;
  dataViewFieldEditor?: IndexPatternFieldEditorStart;
  fieldFormats: FieldFormatsStart;
  uiActions?: UiActionsStart;
  cloud?: CloudStart;
}

export type DataVisualizerPluginSetup = ReturnType<DataVisualizerPlugin['setup']>;
export type DataVisualizerPluginStart = ReturnType<DataVisualizerPlugin['start']>;

export class DataVisualizerPlugin
  implements
    Plugin<
      DataVisualizerPluginSetup,
      DataVisualizerPluginStart,
      DataVisualizerSetupDependencies,
      DataVisualizerStartDependencies
    >
{
  public setup(
    core: CoreSetup<DataVisualizerStartDependencies, DataVisualizerPluginStart>,
    plugins: DataVisualizerSetupDependencies
  ) {
    if (plugins.home) {
      registerHomeAddData(plugins.home);
      registerHomeFeatureCatalogue(plugins.home);
    }

    registerEmbeddables(plugins.embeddable, core);
    plugins.share.url.locators.create(new IndexDataVisualizerLocatorDefinition());
  }

  public start(core: CoreStart, plugins: DataVisualizerStartDependencies) {
    setStartServices(core, plugins);
    return {
      getFileDataVisualizerComponent,
      getIndexDataVisualizerComponent,
      getMaxBytesFormatted,
    };
  }
}
