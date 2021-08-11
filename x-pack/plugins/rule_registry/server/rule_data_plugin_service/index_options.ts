/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ValidFeatureId } from '@kbn/rule-data-utils';

// TODO: validation (either via io-ts or a simple one)
// TODO: add JSDoc comments
export interface IndexOptions {
  feature: ValidFeatureId;
  registrationContext: string;
  dataset: Dataset;
  componentTemplateRefs: string[];
  componentTemplates: ComponentTemplateOptions[]; // NOTE: order matters
  indexTemplate: IndexTemplateOptions;
  ilmPolicy?: IlmPolicyOptions;
  secondaryAlias?: string;
}

export enum Dataset {
  alerts = 'alerts',
  events = 'events',
}

export type Settings = estypes.IndicesIndexSettings;
export type Mappings = estypes.MappingTypeMapping;
export type Version = estypes.VersionNumber;
export type Meta = estypes.Metadata;

export interface ComponentTemplateOptions {
  name: string;
  version: Version; // TODO: encapsulate versioning (base on Kibana version)
  mappings?: Mappings;
  settings?: Settings;
  _meta?: Meta;
}

export interface IndexTemplateOptions {
  version: Version; // TODO: encapsulate versioning (base on Kibana version)
  _meta?: Meta;
}

export type IlmPolicyOptions = Omit<estypes.IlmPolicy, 'name'>;
