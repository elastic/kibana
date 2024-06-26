/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { generateHistoryIndexName } from '../helpers/generate_index_name';

function createIdTemplate(definition: EntityDefinition) {
  return definition.identityFields.reduce((template, id) => {
    return template.replaceAll(id.field, `entity.identityFields.${id.field}`);
  }, definition.displayNameTemplate);
}

function mapDestinationToPainless(destination: string, source: string) {
  const fieldParts = destination.split('.');
  return fieldParts.reduce((acc, _part, currentIndex, parts) => {
    if (currentIndex + 1 === parts.length) {
      return `${acc}\n  ctx${parts
        .map((s) => `["${s}"]`)
        .join('')} = ctx.entity.metadata.${source}.keySet();`;
    }
    return `${acc}\n if(ctx.${parts.slice(0, currentIndex + 1).join('.')} == null)  ctx${parts
      .slice(0, currentIndex + 1)
      .map((s) => `["${s}"]`)
      .join('')} = new HashMap();`;
  }, '');
}

function createMetadataPainlessScript(definition: EntityDefinition) {
  if (!definition.metadata) {
    return '';
  }
  return definition.metadata.reduce((script, def) => {
    const source = def.source;
    const destination = def.destination || def.source;
    return `${script}if (ctx.entity?.metadata?.${source.replaceAll(
      '.',
      '?.'
    )} != null) {${mapDestinationToPainless(destination, source)}\n}\n`;
  }, '');
}

export function generateHistoryProcessors(definition: EntityDefinition, spaceId: string) {
  return [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      set: {
        field: 'entity.spaceId',
        value: spaceId,
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
        field: 'entity.displayName',
        value: createIdTemplate(definition),
      },
    },
    {
      script: {
        description: 'Generated the entity.id field',
        source: `
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

        if (ctx["entity"]["identityFields"] != null) {
          // Get the values as a collection
          Collection values = collectValues(ctx["entity"]["identityFields"]);

          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);

          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            entityId.append(instanceValue);
            entityId.append(":");
          }

            // Assign the slo.instanceId
          ctx["entity"]["id"] = entityId.length() > 0 ? entityId.substring(0, entityId.length() - 1) : "unknown";
        }
       `,
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
      ? [{ script: { source: createMetadataPainlessScript(definition) } }]
      : []),
    {
      remove: {
        field: 'entity.metadata',
        ignore_missing: true,
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: `${generateHistoryIndexName(definition)}.${spaceId}.`,
        date_rounding: 'M',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
  ];
}
