/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';
import type { UseFieldsMetadataHook } from './hooks/use_fields_metadata/use_fields_metadata';
import type { IFieldsMetadataClient } from './services/fields_metadata';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataClientSetup {}

export interface FieldsMetadataClientStart {
  client: IFieldsMetadataClient;
  useFieldsMetadata: UseFieldsMetadataHook;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataClientSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataClientStartDeps {}

export type FieldsMetadataClientCoreSetup = CoreSetup<
  FieldsMetadataClientStartDeps,
  FieldsMetadataClientStart
>;
export type FieldsMetadataClientCoreStart = CoreStart;
export type FieldsMetadataClientPluginClass = PluginClass<
  FieldsMetadataClientSetup,
  FieldsMetadataClientStart,
  FieldsMetadataClientSetupDeps,
  FieldsMetadataClientStartDeps
>;

export type FieldsMetadataClientStartServicesAccessor =
  FieldsMetadataClientCoreSetup['getStartServices'];
export type FieldsMetadataClientStartServices =
  ReturnType<FieldsMetadataClientStartServicesAccessor>;
