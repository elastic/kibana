/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceStart } from '@kbn/core/public';

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export interface DataVisualizerSetupDependencies {
  home?: HomePublicPluginSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  uiActions?: UiActionsSetup;
}
export interface DataVisualizerStartDependencies {
  analytics: AnalyticsServiceStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fileUpload: FileUploadPluginStart;
  maps: MapsStartApi;
  embeddable: EmbeddableStart;
  share: SharePluginStart;
  lens?: LensPublicStart;
  charts: ChartsPluginStart;
  dataViewFieldEditor?: IndexPatternFieldEditorStart;
  fieldFormats: FieldFormatsStart;
  uiActions?: UiActionsStart;
  cloud?: CloudStart;
  savedSearch: SavedSearchPublicPluginStart;
  usageCollection?: UsageCollectionStart;
}
