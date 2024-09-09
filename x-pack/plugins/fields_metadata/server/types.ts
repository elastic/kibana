/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

import {
  FieldsMetadataServiceSetup,
  FieldsMetadataServiceStart,
} from './services/fields_metadata/types';

export type FieldsMetadataPluginCoreSetup = CoreSetup<
  FieldsMetadataServerPluginStartDeps,
  FieldsMetadataServerStart
>;
export type FieldsMetadataPluginStartServicesAccessor =
  FieldsMetadataPluginCoreSetup['getStartServices'];

export interface FieldsMetadataServerSetup {
  registerIntegrationFieldsExtractor: FieldsMetadataServiceSetup['registerIntegrationFieldsExtractor'];
}

export interface FieldsMetadataServerStart {
  getClient: FieldsMetadataServiceStart['getClient'];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServerPluginSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServerPluginStartDeps {}
