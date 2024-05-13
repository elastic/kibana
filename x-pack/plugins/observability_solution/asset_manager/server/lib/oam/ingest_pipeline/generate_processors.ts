/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAMDefinition } from '@kbn/oam-schema';
import { generateIndexName } from '../helpers/generate_index_name';

function createIdTemplate(definition: OAMDefinition) {
  return definition.identityFields.reduce((template, field) => {
    return template.replaceAll(field, `asset.identity.${field}`);
  }, definition.identityTemplate);
}

function mapDesitnationToPainless(destination: string, source: string) {
  const fieldParts = destination.split('.');
  return fieldParts.reduce((acc, _part, currentIndex, parts) => {
    if (currentIndex + 1 === parts.length) {
      return `${acc}\n  ctx${parts
        .map((s) => `["${s}"]`)
        .join('')} = ctx.asset.metadata.${source}.keySet();`;
    }
    return `${acc}\n  ctx${parts
      .slice(0, currentIndex + 1)
      .map((s) => `["${s}"]`)
      .join('')} = new HashMap();`;
  }, '');
}

function createMetadataPainlessScript(definition: OAMDefinition) {
  if (!definition.metadata) {
    return '';
  }
  return definition.metadata.reduce((script, def) => {
    const source = def.source;
    const destination = def.destination || def.source;
    return `${script}if (ctx.asset?.metadata?.${source.replaceAll(
      '.',
      '?.'
    )} != null) {${mapDesitnationToPainless(destination, source)}\n}\n`;
  }, '');
}

export function generateProcessors(definition: OAMDefinition) {
  return [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      set: {
        field: 'asset.definitionId',
        value: definition.id,
      },
    },
    {
      set: {
        field: 'asset.indexPatterns',
        value: JSON.stringify(definition.indexPatterns),
      },
    },
    {
      json: {
        field: 'asset.indexPatterns',
      },
    },
    {
      set: {
        field: 'asset.id',
        value: createIdTemplate(definition),
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
        field: 'asset.metadata',
        ignore_missing: true,
      },
    },
    {
      set: {
        field: '_index',
        value: generateIndexName(definition),
      },
    },
  ];
}
