/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../common/validate';
import { InternalArtifactSchema, InternalManifestSchema } from '../../schemas/artifacts';
import {
  manifestSchemaVersion,
  ManifestSchemaVersion,
} from '../../../../common/endpoint/schema/common';
import { ManifestSchema, manifestSchema } from '../../../../common/endpoint/schema/manifest';
import { ManifestConstants } from './common';
import { ManifestEntry } from './manifest_entry';

export interface ManifestDiff {
  type: string;
  id: string;
}

export class Manifest {
  private created: Date;
  private entries: Record<string, ManifestEntry>;
  private schemaVersion: ManifestSchemaVersion;

  // For concurrency control
  private version: string;

  constructor(created: Date, schemaVersion: string, version: string) {
    this.created = created;
    this.entries = {};
    this.version = version;

    const [validated, errors] = validate(
      (schemaVersion as unknown) as object,
      manifestSchemaVersion
    );

    if (errors != null || validated === null) {
      throw new Error(`Invalid manifest version: ${schemaVersion}`);
    }

    this.schemaVersion = validated;
  }

  public static fromArtifacts(
    artifacts: InternalArtifactSchema[],
    schemaVersion: string,
    oldManifest: Manifest
  ): Manifest {
    const manifest = new Manifest(new Date(), schemaVersion, oldManifest.getVersion());
    artifacts.forEach((artifact) => {
      const id = `${artifact.identifier}-${artifact.decodedSha256}`;
      const existingArtifact = oldManifest.getArtifact(id);
      if (existingArtifact) {
        manifest.addEntry(existingArtifact);
      } else {
        manifest.addEntry(artifact);
      }
    });
    return manifest;
  }

  public getSchemaVersion(): ManifestSchemaVersion {
    return this.schemaVersion;
  }

  public getVersion(): string {
    return this.version;
  }

  public setVersion(version: string) {
    this.version = version;
  }

  public addEntry(artifact: InternalArtifactSchema) {
    const entry = new ManifestEntry(artifact);
    this.entries[entry.getDocId()] = entry;
  }

  public contains(artifactId: string): boolean {
    return artifactId in this.entries;
  }

  public getEntries(): Record<string, ManifestEntry> {
    return this.entries;
  }

  public getArtifact(artifactId: string): InternalArtifactSchema | undefined {
    return this.entries[artifactId]?.getArtifact();
  }

  public diff(manifest: Manifest): ManifestDiff[] {
    const diffs: ManifestDiff[] = [];

    for (const id in manifest.getEntries()) {
      if (!this.contains(id)) {
        diffs.push({ type: 'delete', id });
      }
    }

    for (const id in this.entries) {
      if (!manifest.contains(id)) {
        diffs.push({ type: 'add', id });
      }
    }

    return diffs;
  }

  public toEndpointFormat(): ManifestSchema {
    const manifestObj: ManifestSchema = {
      manifest_version: this.version ?? ManifestConstants.INITIAL_VERSION,
      schema_version: this.schemaVersion,
      artifacts: {},
    };

    for (const entry of Object.values(this.entries)) {
      manifestObj.artifacts[entry.getIdentifier()] = entry.getRecord();
    }

    const [validated, errors] = validate(manifestObj, manifestSchema);
    if (errors != null) {
      throw new Error(errors);
    }

    return validated as ManifestSchema;
  }

  public toSavedObject(): InternalManifestSchema {
    return {
      created: this.created.getTime(),
      ids: Object.keys(this.entries),
    };
  }
}
