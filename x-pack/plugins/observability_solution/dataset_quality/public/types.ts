/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DatasetQualityProps } from './components/dataset_quality';
import type { CreateDatasetQualityController } from './controller';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}

export interface DatasetQualityPluginStart {
  DatasetQuality: ComponentType<DatasetQualityProps>;
  createDatasetQualityController: CreateDatasetQualityController;
}

export interface DatasetQualityStartDeps {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  fieldFormats: FieldFormatsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface DatasetQualitySetupDeps {
  share: SharePluginSetup;
}
