/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}

export interface DatasetQualityPluginStart {
  DatasetQuality: ComponentType;
}

export interface DatasetQualityStartDeps {
  share: SharePluginStart;
  fieldFormats: FieldFormatsStart;
}

export interface DatasetQualitySetupDeps {
  share: SharePluginSetup;
}
