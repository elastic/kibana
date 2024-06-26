/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { generateLatestIndexName } from '../helpers/generate_index_name';

function mapDestinationToPainless(destination: string, source: string) {
  const fieldParts = destination.split('.');
  return fieldParts.reduce((acc, _part, currentIndex, parts) => {
    if (currentIndex + 1 === parts.length) {
      return `${acc}\n  ctx${parts
        .map((s) => `["${s}"]`)
        .join('')} = ctx.entity.metadata.${source}.data.keySet();`;
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
    )}.data != null) {${mapDestinationToPainless(destination, source)}\n}\n`;
  }, '');
}

export function generateLatestProcessors(definition: EntityDefinition, spaceId: string) {
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
      set: {
        field: '_index',
        value: `${generateLatestIndexName(definition)}.${spaceId}`,
      },
    },
  ];
}
