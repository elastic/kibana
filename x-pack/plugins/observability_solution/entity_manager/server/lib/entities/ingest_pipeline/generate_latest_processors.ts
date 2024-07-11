/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { ENTITY_SCHEMA_VERSION_V1 } from '../../../../common/constants_entities';
import { generateLatestIndexName } from '../helpers/generate_component_id';

function mapDestinationToPainless(destination: string) {
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
    )}.data != null) {${mapDestinationToPainless(destination)}\n}\n`;
  }, '');
}

function liftIdentityFieldsToDocumentRoot(definition: EntityDefinition) {
  return definition.identityFields.map((identityField) => ({
    script: {
      if: `ctx.entity.identity.${identityField.field.replaceAll(
        '.',
        '?.'
      )} != null && ctx.entity.identity.${identityField.field}.size() != 0`,
      source: `
        ctx.${identityField.field} = ctx.entity.identity.${identityField.field}.keySet().toArray()[0];
      `,
    },
  }));
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
    ...liftIdentityFieldsToDocumentRoot(definition),
    {
      remove: {
        field: 'entity.identity',
        ignore_missing: true,
      },
    },
    {
      // This must happen AFTER we lift the identity fields into the root of the document
      set: {
        field: 'entity.displayName',
        value: definition.displayNameTemplate,
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
