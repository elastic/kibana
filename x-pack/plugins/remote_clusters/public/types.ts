/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup } from 'src/plugins/management/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { RegisterManagementAppArgs } from 'src/plugins/management/public';
import { I18nStart } from 'kibana/public';

export interface Dependencies {
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export { RegisterManagementAppArgs };

export { I18nStart };
