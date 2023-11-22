/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';
import { AppMountParameters } from '@kbn/core/public';
import { SerializableRecord } from '@kbn/utility-types';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}

export interface DatasetQualityPluginStart {
  DatasetQuality: ComponentType;
}

export interface DatasetQualityStartDeps {
  share: SharePluginStart;
}

export interface DatasetQualitySetupDeps {
  share: SharePluginSetup;
}

export interface DatasetQualityLocationState extends SerializableRecord {
  origin?: {
    id: 'application-log-onboarding';
  };
}

export type DatasetQualityAppMountParameters = AppMountParameters<DatasetQualityLocationState>;
