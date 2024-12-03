/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';
import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { pick } from 'lodash/fp';

import { buildEntityDefinitionId } from '../utils';

import type { EntityEngineInstallationDescriptor } from './types';
import { BASE_ENTITY_INDEX_MAPPING } from './constants';

// export class UnitedEntityDefinition {
//   version: string;
//   entityType: EntityType;
//   indexPatterns: string[];
//   fields: UnitedDefinitionField[];
//   namespace: string;
//   entityManagerDefinition: EntityDefinition;
//   fieldRetentionDefinition: FieldRetentionDefinition;
//   indexMappings: MappingTypeMapping;
//   syncDelay: string;
//   frequency: string;

//   constructor(opts: {
//     version: string;
//     entityType: EntityType;
//     indexPatterns: string[];
//     fields: UnitedDefinitionField[];
//     namespace: string;
//     syncDelay: string;
//     frequency: string;
//   }) {
//     this.version = opts.version;
//     this.entityType = opts.entityType;
//     this.indexPatterns = opts.indexPatterns;
//     this.fields = opts.fields;
//     this.frequency = opts.frequency;
//     this.syncDelay = opts.syncDelay;
//     this.namespace = opts.namespace;
//     this.entityManagerDefinition = this.toEntityManagerDefinition();
//     this.fieldRetentionDefinition = this.toFieldRetentionDefinition();
//     this.indexMappings = this.toIndexMappings();
//   }

//   private toEntityManagerDefinition(): EntityDefinition {
//     const { entityType, namespace, indexPatterns, syncDelay, frequency } = this;
//     const identityField = getIdentityFieldForEntityType(this.entityType);
//     const metadata = this.fields
//       .filter((field) => field.definition)
//       .map((field) => field.definition!); // eslint-disable-line @typescript-eslint/no-non-null-assertion

//     return entityDefinitionSchema.parse({
//       id: buildEntityDefinitionId(entityType, namespace),
//       name: `Security '${entityType}' Entity Store Definition`,
//       type: entityType,
//       indexPatterns,
//       identityFields: [identityField],
//       displayNameTemplate: `{{${identityField}}}`,
//       metadata,
//       latest: {
//         timestampField: '@timestamp',
//         lookbackPeriod: DEFAULT_LOOKBACK_PERIOD,
//         settings: {
//           syncDelay,
//           frequency,
//         },
//       },
//       version: this.version,
//       managed: true,
//     });
//   }

//   private toFieldRetentionDefinition(): FieldRetentionDefinition {
//     return {
//       entityType: this.entityType,
//       matchField: getIdentityFieldForEntityType(this.entityType),
//       fields: this.fields
//         .filter((field) => field.retention_operator !== undefined)
//         .map((field) => field.retention_operator as FieldRetentionOperator),
//     };
//   }

//   private toIndexMappings(): MappingTypeMapping {
//     const identityField = getIdentityFieldForEntityType(this.entityType);

//     const initialMappings: MappingProperties = {
//       ...BASE_ENTITY_INDEX_MAPPING,
//       [identityField]: {
//         type: 'keyword',
//         fields: {
//           text: {
//             type: 'match_only_text',
//           },
//         },
//       },
//     };

//     const properties = this.fields.reduce((acc, { field, mapping }) => {
//       if (!mapping) {
//         return acc;
//       }
//       acc[field] = mapping;
//       return acc;
//     }, initialMappings);

//     properties[identityField] = {
//       type: 'keyword',
//       fields: {
//         text: {
//           type: 'match_only_text',
//         },
//       },
//     };

//     return {
//       properties,
//     };
//   }
// }

export const convertToEntityManagerDefinition = (
  description: EntityEngineInstallationDescriptor,
  options: { fieldHistoryLength: number; indexPattern: string; namespace: string; filter: string }
): EntityDefinition => {
  const indexPatterns = options.indexPattern
    ? description.indexPatterns.concat(options.indexPattern.split(','))
    : description.indexPatterns;

  const metadata = [
    ...description.fields.map(pick(['source', 'destination', 'aggregation'])),
    ...description.identityFields.map((source) => ({ source })),
  ];

  return entityDefinitionSchema.parse({
    id: buildEntityDefinitionId(description.entityType, options.namespace),
    name: `Security '${description.entityType}' Entity Store Definition`,
    type: description.entityType,
    indexPatterns,
    identityFields: description.identityFields,
    displayNameTemplate: `{{${description.identityFields.join('_')}}}`,
    metadata,
    latest: {
      timestampField: description.settings.timestampField,
      lookbackPeriod: description.settings.lookbackPeriod,
      settings: {
        syncDelay: description.settings.syncDelay,
        frequency: description.settings.frequency,
      },
    },
    version: description.version,
    managed: true,
  });
};

export const generateIndexMappings = (
  description: EntityEngineInstallationDescriptor
): MappingTypeMapping => {
  const initialMappings = description.identityFields.reduce(
    (acc, field): Record<string, MappingProperty> => ({
      ...acc,
      [field]: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    BASE_ENTITY_INDEX_MAPPING
  );

  const properties = description.fields.reduce((acc, { destination, mapping }) => {
    if (!mapping) {
      return acc;
    }
    acc[destination] = mapping;
    return acc;
  }, initialMappings);

  return {
    properties,
  };
};
