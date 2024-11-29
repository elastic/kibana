/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';
import type {
  IngestProcessorContainer,
  MappingProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { DEFAULT_LOOKBACK_PERIOD } from '../constants';
import { buildEntityDefinitionId, getIdentityFieldForEntityType } from '../utils';
import type {
  FieldRetentionDefinition,
  FieldRetentionOperator,
} from '../field_retention_definition';
import type {
  EntityDefinitionMetadataElement,
  MappingProperties,
  UnitedDefinitionField,
} from './types';
import { BASE_ENTITY_INDEX_MAPPING } from './constants';

export class UnitedEntityDefinition {
  version: string;
  entityType: EntityType;
  indexPatterns: string[];
  fields: UnitedDefinitionField[];
  namespace: string;
  entityManagerDefinition: EntityDefinition;
  fieldRetentionDefinition: FieldRetentionDefinition;
  indexMappings: MappingTypeMapping;
  syncDelay: string;
  frequency: string;

  constructor(opts: {
    version: string;
    entityType: EntityType;
    indexPatterns: string[];
    fields: UnitedDefinitionField[];
    namespace: string;
    syncDelay: string;
    frequency: string;
  }) {
    this.version = opts.version;
    this.entityType = opts.entityType;
    this.indexPatterns = opts.indexPatterns;
    this.fields = opts.fields;
    this.frequency = opts.frequency;
    this.syncDelay = opts.syncDelay;
    this.namespace = opts.namespace;
    this.entityManagerDefinition = this.toEntityManagerDefinition();
    this.fieldRetentionDefinition = this.toFieldRetentionDefinition();
    this.indexMappings = this.toIndexMappings();
  }

  private toEntityManagerDefinition(): EntityDefinition {
    const { entityType, namespace, indexPatterns, syncDelay, frequency } = this;
    const identityField = getIdentityFieldForEntityType(this.entityType);
    const metadata = this.fields
      .filter((field) => field.definition)
      .map((field) => field.definition!); // eslint-disable-line @typescript-eslint/no-non-null-assertion

    return entityDefinitionSchema.parse({
      id: buildEntityDefinitionId(entityType, namespace),
      name: `Security '${entityType}' Entity Store Definition`,
      type: entityType,
      indexPatterns,
      identityFields: [identityField],
      displayNameTemplate: `{{${identityField}}}`,
      metadata,
      latest: {
        timestampField: '@timestamp',
        lookbackPeriod: DEFAULT_LOOKBACK_PERIOD,
        settings: {
          syncDelay,
          frequency,
        },
      },
      version: this.version,
      managed: true,
    });
  }

  private toFieldRetentionDefinition(): FieldRetentionDefinition {
    return {
      entityType: this.entityType,
      matchField: getIdentityFieldForEntityType(this.entityType),
      fields: this.fields
        .filter((field) => field.retention_operator !== undefined)
        .map((field) => field.retention_operator as FieldRetentionOperator),
    };
  }

  private toIndexMappings(): MappingTypeMapping {
    const identityField = getIdentityFieldForEntityType(this.entityType);

    const initialMappings: MappingProperties = {
      ...BASE_ENTITY_INDEX_MAPPING,
      [identityField]: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    };

    const properties = this.fields.reduce((acc, { field, mapping }) => {
      if (!mapping) {
        return acc;
      }
      acc[field] = mapping;
      return acc;
    }, initialMappings);

    properties[identityField] = {
      type: 'keyword',
      fields: {
        text: {
          type: 'match_only_text',
        },
      },
    };

    return {
      properties,
    };
  }
}

interface EntityEngineInstallationDescriptor {
  version: string;
  entityType: EntityType;
  indexPatterns: string[];
  identityFields: string[];
  fields: Array<
    EntityDefinitionMetadataElement & {
      mapping: MappingProperty;
      retention_operator: FieldRetentionOperator;
    }
  >;
  indexMappings: MappingTypeMapping;
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

const entityMetadataExtractorProcessor = {
  script: {
    tag: 'entity_metadata_extractor',
    on_failure: [
      {
        set: {
          field: 'error.message',
          value:
            'Processor {{ _ingest.on_failure_processor_type }} with tag {{ _ingest.on_failure_processor_tag }} in pipeline {{ _ingest.on_failure_pipeline }} failed with message {{ _ingest.on_failure_message }}',
        },
      },
    ],
    lang: 'painless',
    source: `
Map merged = ctx;
def id = ctx.entity.id;
for (meta in ctx.collected.metadata) {
    Object json = Processors.json(meta);
    
    for (entry in ((Map)json)[id].entrySet()) {
      String key = entry.getKey();
      Object value = entry.getValue();
      merged.put(key, value);
    }
}
merged.entity.id = id;
ctx = merged;
`,
  },
};
const uni: EntityEngineInstallationDescriptor = {
  version: '1.0.0',
  entityType: 'universal',
  indexPatterns: ['logs-store'],
  identityFields: ['related.entity'],
  fields: [
    {
      source: 'entities.keyword',
      destination: 'related.entity',
      aggregation: {
        type: 'terms',
        limit: 10,
      },
      retention_operator: { operation: 'collect_values', maxLength: 10 },
      mapping: { type: 'keyword' },
    },
  ],
  settings: {
    syncDelay: '1m',
    frequency: '1m',
    lookbackPeriod: '1d',
    timestampField: '@timestamp',
  },
  pipeline: [entityMetadataExtractorProcessor],

  indexMappings: {},
};
