/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  MappingProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityDefinition } from '@kbn/entities-schema';
import type { EntityType } from '../../../../../common/api/entity_analytics';

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;
export type EntityDefinitionMetadataElement = NonNullable<EntityDefinition['metadata']>[number];

type PickPartial<T, K extends keyof T, Optional extends K = never> = {
  [P in K as P extends Optional ? never : P]: T[P];
} & {
  [P in K as P extends Optional ? P : never]?: Partial<T[P]>;
};

export type EntityDescription = PickPartial<
  EntityEngineInstallationDescriptor,
  | 'version'
  | 'entityType'
  | 'fields'
  | 'identityFields'
  | 'indexPatterns'
  | 'indexMappings'
  | 'settings'
  | 'pipeline',
  'indexPatterns' | 'indexMappings' | 'settings' | 'pipeline'
>;

const foo: EntityDescription = {
  settings,
};

export interface EntityEngineInstallationDescriptor {
  id: string;
  version: string;
  entityType: EntityType;

  identityFields: string[];

  /**
   * Default static index patterns to use as the source of entity data.
   * By default, the Security Data View patterns will be added to this list.
   * API parameters can be used to add additional patterns.
   **/
  indexPatterns: string[];

  /**
   * The mappings for the entity store index.
   */
  indexMappings: MappingTypeMapping;

  /**
   * Field descriptions for the entity.
   * Identity fields are not included here as they are treated separately.
   */
  fields: FieldDescription[];

  /**
   * Entity manager default pivot transform settings.
   * Any kibana.yml configuration will override these settings.
   */
  settings: {
    syncDelay: string;
    frequency: string;
    lookbackPeriod: string;
    timestampField: string;
  };

  /**
   * The ingest pipeline to apply to the entity data.
   * This can be an array of processors which get appended to the default pipeline,
   * or a function that takes the default processors and returns an array of processors.
   **/
  pipeline:
    | IngestProcessorContainer[]
    | ((defaultProcessors: IngestProcessorContainer) => IngestProcessorContainer[]);
}

export type FieldDescription = EntityDefinitionMetadataElement & {
  mapping: MappingProperty;
  retention: FieldRetentionOp;
};

export type FieldRetentionOp =
  | { operation: 'collect_values'; maxLength: number }
  | { operation: 'prefer_newest_value' }
  | { operation: 'prefer_oldest_value' };
