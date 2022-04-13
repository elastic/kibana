/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import type { CloudStart } from '../../cloud/public';
import type { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import type { DiscoverSetup, DiscoverStart } from '../../../../src/plugins/discover/public';
import { Plugin } from '../../../../src/core/public';

import { setStartServices } from './kibana_services';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type { FileUploadPluginStart } from '../../file_upload/public';
import type { UnifiedSearchPublicPluginStart } from '../../../../src/plugins/unified_search/public';
import type { MapsStartApi } from '../../maps/public';
import type { SecurityPluginSetup } from '../../security/public';
import type { LensPublicStart } from '../../lens/public';
import type { IndexPatternFieldEditorStart } from '../../../../src/plugins/data_view_field_editor/public';
import { getFileDataVisualizerComponent, getIndexDataVisualizerComponent } from './api';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import { registerHomeAddData, registerHomeFeatureCatalogue } from './register_home';
import { registerEmbeddables } from './application/index_data_visualizer/embeddables';
import { FieldFormatsStart } from '../../../../src/plugins/field_formats/public';
import type { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
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
