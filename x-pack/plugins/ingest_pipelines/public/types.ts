/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup } from 'src/plugins/management/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { SharePluginStart, SharePluginSetup } from 'src/plugins/share/public';
import type { FileUploadPluginStart } from '../../file_upload/public';

export interface SetupDependencies {
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
  share: SharePluginSetup;
}

export interface StartDependencies {
  share: SharePluginStart;
  fileUpload: FileUploadPluginStart;
}
