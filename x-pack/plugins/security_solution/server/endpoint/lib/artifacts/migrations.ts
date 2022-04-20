/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';

import { InternalManifestSchema } from '../../schemas/artifacts';

export type OldInternalManifestSchema = Omit<InternalManifestSchema, 'artifacts'> & {
  ids: string[];
};

export const migrations: SavedObjectMigrationMap = {
  '7.12.0': (
    doc: SavedObjectUnsanitizedDoc<OldInternalManifestSchema>
  ): SavedObjectSanitizedDoc<InternalManifestSchema> => {
    const { ids, ...rest } = doc.attributes;

    return {
      ...doc,
      references: doc.references || [],
      attributes: {
        ...rest,
        artifacts: (ids || []).map((artifactId) => ({ artifactId, policyId: undefined })),
      },
    };
  },
};
