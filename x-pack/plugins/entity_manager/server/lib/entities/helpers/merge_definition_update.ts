/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import { mergeWith, omit } from 'lodash';

export function mergeEntityDefinitionUpdate(
  definition: EntityDefinition,
  update: EntityDefinitionUpdate
) {
  const validatedDefinition: EntityDefinitionUpdate = { ...definition };

  // Make sure that if dataViewId or indexPatterns is set we delete the other one
  if (update.dataViewId) {
    delete validatedDefinition.indexPatterns;
  } else if (update.indexPatterns) {
    delete validatedDefinition.dataViewId;
  }
  const updatedDefinition = mergeWith(validatedDefinition, update, (value, other) => {
    // we don't want to merge arrays (metrics, metadata..) but overwrite them
    if (Array.isArray(value)) {
      return other;
    }
  });

  return omit(updatedDefinition, ['state']) as EntityDefinition;
}
