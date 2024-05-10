/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAMDefinition } from '@kbn/oam-schema';

export function generateMetadataAggregations(definition: OAMDefinition) {
  if (!definition.metadata) {
    return {};
  }
  return definition.metadata.reduce(
    (aggs, metadata) => ({
      ...aggs,
      [`asset.metadata.${metadata.destination ?? metadata.source}`]: {
        terms: {
          field: metadata.source,
          size: metadata.limit ?? 1000,
        },
      },
    }),
    {}
  );
}
