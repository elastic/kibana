/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { generateLatestIndexName } from '../helpers/generate_component_id';

function mapMetadataDestinationToPainless(destination: string) {
  const fieldParts = destination.split('.');
  return fieldParts.reduce((acc, _part, currentIndex, parts) => {
    if (currentIndex + 1 === parts.length) {
      return `${acc}\n  ctx${parts
        .map((s) => `["${s}"]`)
        .join('')} = ctx.entity.metadata.${destination}.data.keySet();`;
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
    const destination = def.destination || def.source;
    return `${script}if (ctx.entity?.metadata?.${destination.replaceAll(
      '.',
      '?.'
    )}.data != null) {${mapMetadataDestinationToPainless(destination)}\n}\n`;
  }, '');
}

function mapIdentityFieldsDestinationToPainless(identityField: string) {
  const fieldParts = identityField.split('.');
  return fieldParts.reduce((acc, _part, currentIndex, parts) => {
    if (currentIndex + 1 === parts.length) {
      const target = `ctx${parts.map((s) => `["${s}"]`).join('')}`;
      const segment = `
      Object[] values = ctx.entity.identityFields.${identityField}.keySet().toArray();
      if (values.length == 1) {
        ${target} = ctx.entity.identityFields.${identityField}.keySet().toArray()[0];
      } else {
       ${target} = ctx.entity.identityFields.${identityField}.keySet().toArray();
      }
      `;
      return `${acc}\n${segment}`;
    }
    return `${acc}\n if(ctx.${parts.slice(0, currentIndex + 1).join('.')} == null)  ctx${parts
      .slice(0, currentIndex + 1)
      .map((s) => `["${s}"]`)
      .join('')} = new HashMap();`;
  }, '');
}

function createIdentityFieldsPainlessScript(definition: EntityDefinition) {
  return definition.identityFields.reduce((script, identityField) => {
    return `${script}if (ctx.entity?.identityFields?.${identityField.field.replaceAll(
      '.',
      '?.'
    )} != null) {${mapIdentityFieldsDestinationToPainless(identityField.field)}\n}\n`;
  }, '');
}

export function generateLatestProcessors(definition: EntityDefinition) {
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
    { script: { source: createIdentityFieldsPainlessScript(definition) } },
    {
      remove: {
        field: 'entity.identityFields',
      },
    },
    {
      set: {
        field: '_index',
        value: `${generateLatestIndexName(definition)}`,
      },
    },
  ];
}
