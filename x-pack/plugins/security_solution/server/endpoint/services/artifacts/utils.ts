/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  InternalUnifiedManifestBaseSchema,
  InternalUnifiedManifestSchema,
} from '../../schemas';

export const mapUnifiedManifestSavedObjectToUnifiedManifest = ({
  id,
  attributes: { artifactIds, policyId, semanticVersion },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at,
}: SavedObject<InternalUnifiedManifestBaseSchema>): InternalUnifiedManifestSchema => {
  return {
    id,
    policyId,
    semanticVersion,
    created: created_at,
    artifactIds,
  };
};
