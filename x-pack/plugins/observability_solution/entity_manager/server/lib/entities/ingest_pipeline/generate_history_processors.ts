/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, ENTITY_SCHEMA_VERSION_V1 } from '@kbn/entities-schema';
import {
  initializePathScript,
  cleanScript,
} from '../helpers/ingest_pipeline_script_processor_helpers';
import { generateHistoryIndexName } from '../helpers/generate_component_id';
import { isBuiltinDefinition } from '../helpers/is_builtin_definition';

function mapDestinationToPainless(field: string) {
  return `
    ${initializePathScript(field)}
    ctx.${field} = ctx.entity.metadata.${field}.keySet();
  `;
}

function createMetadataPainlessScript(definition: EntityDefinition) {
  if (!definition.metadata) {
    return '';
  }

  return definition.metadata.reduce((acc, def) => {
    const destination = def.destination;
    const optionalFieldPath = destination.replaceAll('.', '?.');
    const next = `
      if (ctx.entity?.metadata?.${optionalFieldPath} != null) {
        ${mapDestinationToPainless(destination)}
      }
    `;
    return `${acc}\n${next}`;
  }, '');
}

function liftIdentityFieldsToDocumentRoot(definition: EntityDefinition) {
  return definition.identityFields.map((key) => ({
    set: {
      if: `ctx.entity?.identity?.${key.field.replaceAll('.', '?.')} != null`,
      field: key.field,
      value: `{{entity.identity.${key.field}}}`,
    },
  }));
}

function getCustomIngestPipelines(definition: EntityDefinition) {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}@platform`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}-history@platform`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}@custom`,
      },
    },
    {
      pipeline: {
        ignore_missing_pipeline: true,
        name: `${definition.id}-history@custom`,
      },
    },
  ];
}

export function generateHistoryProcessors(definition: EntityDefinition) {
  return [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      set: {
        field: 'entity.type',
        value: definition.type,
      },
    },
    {
      set: {
        field: 'entity.definitionId',
        value: definition.id,
      },
    },
    {
      set: {
        field: 'entity.definitionVersion',
        value: definition.version,
      },
    },
    {
      set: {
        field: 'entity.schemaVersion',
        value: ENTITY_SCHEMA_VERSION_V1,
      },
    },
    {
      set: {
        field: 'entity.identityFields',
        value: definition.identityFields.map((identityField) => identityField.field),
      },
    },
    {
      script: {
        description: 'Generated the entity.id field',
        source: cleanScript(`
        // This function will recursively collect all the values of a HashMap of HashMaps
        Collection collectValues(HashMap subject) {
          Collection values = new ArrayList();
          // Iterate through the values
          for(Object value: subject.values()) {
            // If the value is a HashMap, recurse
            if (value instanceof HashMap) {
              values.addAll(collectValues((HashMap) value));
            } else {
              values.add(String.valueOf(value));
            }
          }
          return values;
        }

        // Create the string builder
        StringBuilder entityId = new StringBuilder();

        if (ctx["entity"]["identity"] != null) {
          // Get the values as a collection
          Collection values = collectValues(ctx["entity"]["identity"]);

          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);

          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            entityId.append(instanceValue);
            entityId.append(":");
          }

            // Assign the entity.id
          ctx["entity"]["id"] = entityId.length() > 0 ? entityId.substring(0, entityId.length() - 1) : "unknown";
        }
       `),
      },
    },
    {
      fingerprint: {
        fields: ['entity.id'],
        target_field: 'entity.id',
        method: 'MurmurHash3',
      },
    },
    ...(definition.staticFields != null
      ? Object.keys(definition.staticFields).map((field) => ({
          set: { field, value: definition.staticFields![field] },
        }))
      : []),
    ...(definition.metadata != null
      ? [{ script: { source: cleanScript(createMetadataPainlessScript(definition)) } }]
      : []),
    {
      remove: {
        field: 'entity.metadata',
        ignore_missing: true,
      },
    },
    ...liftIdentityFieldsToDocumentRoot(definition),
    {
      remove: {
        field: 'entity.identity',
        ignore_missing: true,
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: `${generateHistoryIndexName(definition)}.`,
        date_rounding: 'M',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
    ...getCustomIngestPipelines(definition),
  ];
}
