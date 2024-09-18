/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition as EemEntityDefinition } from '@kbn/entities-schema';
import { InventoryEntityDefinition } from '../../../common/entities';

export function eemToInventoryDefinition(
  definition: EemEntityDefinition
): InventoryEntityDefinition {
  return {
    id: definition.id,
    type: definition.type,
    identityFields: definition.identityFields,
    definitionType: 'inventory',
    displayNameTemplate: definition.displayNameTemplate,
    label: definition.name,
    managed: definition.managed,
    metadata:
      definition.metadata?.map(({ source, destination }) => {
        return {
          source,
          destination,
        };
      }) ?? [],
    sources: [
      {
        indexPatterns: definition.indexPatterns,
      },
    ],
    extractionDefinitions: [
      {
        source: {
          indexPatterns: definition.indexPatterns,
        },
        metadata: definition.metadata?.map((option) => ({ ...option, limit: 10 })) ?? [],
      },
    ],
  };
}
