/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { PackagePolicy } from '../../../../common';
import { relativeDownloadUrlFromArtifact } from '../../../services/artifacts/mappings';
import type { Artifact } from '../../../services';

type ArtifactManifestList = Record<
  string,
  Pick<Artifact, 'decodedSha256' | 'identifier' | 'relative_url'>
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
      for (const artifactManifest of Object.values(artifactList)) {
        artifactManifest.relative_url = relativeDownloadUrlFromArtifact(artifactManifest);
      }
    }
  }

  return packagePolicyDoc;
};
