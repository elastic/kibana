/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn } from '@kbn/core/server';
import { InfraSourceConfiguration } from '../../../../common/source_configuration/source_configuration';
import { extractInventorySavedViewReferences } from '../saved_object_references';

export const extractInventoryDefaultViewReference: SavedObjectMigrationFn<
  InfraSourceConfiguration,
  InfraSourceConfiguration
> = (sourceConfigurationDocument) => {
  const { attributes, references } = extractInventorySavedViewReferences(
    sourceConfigurationDocument.attributes
  );

  return {
    ...sourceConfigurationDocument,
    attributes,
    references: [...(sourceConfigurationDocument.references ?? []), ...references],
  };
};
