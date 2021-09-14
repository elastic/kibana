/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup } from 'src/plugins/management/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { RegisterManagementAppArgs } from 'src/plugins/management/public';
import { I18nStart } from 'kibana/public';
import { CloudSetup } from '../../cloud/public';

export interface Dependencies {
  management: ManagementSetup;
  usageCollection: UsageCollectionSetup;
  cloud: CloudSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export { RegisterManagementAppArgs };

export { I18nStart };
