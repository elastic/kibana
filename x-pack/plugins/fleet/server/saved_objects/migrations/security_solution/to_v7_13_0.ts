/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';
import { relativeDownloadUrlFromArtifact } from '../../../services/artifacts/mappings';
import type { ArtifactElasticsearchProperties } from '../../../services';

type ArtifactManifestList = Record<
  string,
  Pick<ArtifactElasticsearchProperties, 'identifier' | 'decoded_sha256' | 'relative_url'>
>;

export const migrateEndpointPackagePolicyToV7130: SavedObjectMigrationFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    // Adjust all artifact URLs so that they point at fleet-server
    const artifactList: ArtifactManifestList =
      packagePolicyDoc.attributes?.inputs[0]?.config?.artifact_manifest.value.artifacts;

    if (artifactList) {
      for (const [identifier, artifactManifest] of Object.entries(artifactList)) {
        artifactManifest.relative_url = relativeDownloadUrlFromArtifact({
          identifier,
          decodedSha256: artifactManifest.decoded_sha256,
        });
      }
    }
  }

  return packagePolicyDoc;
};
