/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { SharePluginStart, SharePluginSetup } from '@kbn/share-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';

export interface SetupDependencies {
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  share: SharePluginStart;
  fileUpload: FileUploadPluginStart;
}
