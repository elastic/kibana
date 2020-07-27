/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { validate } from '../../../../common/validate';
import {
  InternalArtifactSchema,
  InternalManifestSchema,
  internalArtifactCompleteSchema,
  InternalArtifactCompleteSchema,
} from '../../schemas/artifacts';
import {
  manifestSchemaVersion,
  ManifestSchemaVersion,
} from '../../../../common/endpoint/schema/common';
import { ManifestSchema, manifestSchema } from '../../../../common/endpoint/schema/manifest';
import { ManifestEntry } from './manifest_entry';
import { maybeCompressArtifact, isCompressed } from './lists';
import { getArtifactId } from './common';

export interface ManifestDiff {
  type: string;
  id: string;
}

export class Manifest {
  private entries: Record<string, ManifestEntry>;
  private schemaVersion: ManifestSchemaVersion;

  // For concurrency control
  private version: string | undefined;

  constructor(schemaVersion: string, version?: string) {
    this.entries = {};
    this.version = version;

    const [validated, errors] = validate(
      (schemaVersion as unknown) as object,
      manifestSchemaVersion
    );

    if (errors != null || validated === null) {
      throw new Error(`Invalid manifest schema version: ${schemaVersion}`);
    }

    this.schemaVersion = validated;
  }

  public static getDefault(schemaVersion: string) {
    return new Manifest(schemaVersion);
  }

  public static fromArtifacts(
    artifacts: InternalArtifactCompleteSchema[],
    schemaVersion: string,
    oldManifest: Manifest
  ): Manifest {
    const manifest = new Manifest(schemaVersion, oldManifest.getSoVersion());
    artifacts.forEach((artifact) => {
      const id = getArtifactId(artifact);
      const existingArtifact = oldManifest.getArtifact(id);
      if (existingArtifact) {
        manifest.addEntry(existingArtifact);
      } else {
        manifest.addEntry(artifact);
      }
    });
    return manifest;
  }

  public static fromPkgConfig(manifestPkgConfig: ManifestSchema): Manifest | null {
    if (manifestSchema.is(manifestPkgConfig)) {
      const manifest = new Manifest(manifestPkgConfig.schema_version);
      for (const [identifier, artifactRecord] of Object.entries(manifestPkgConfig.artifacts)) {
        const artifact = {
          identifier,
          compressionAlgorithm: artifactRecord.compression_algorithm,
          encryptionAlgorithm: artifactRecord.encryption_algorithm,
          decodedSha256: artifactRecord.decoded_sha256,
          decodedSize: artifactRecord.decoded_size,
          encodedSha256: artifactRecord.encoded_sha256,
          encodedSize: artifactRecord.encoded_size,
        };
        manifest.addEntry(artifact);
      }
      return manifest;
    } else {
      return null;
    }
  }

  public async compressArtifact(id: string): Promise<Error | null> {
    try {
      const artifact = this.getArtifact(id);
      if (artifact == null) {
        throw new Error(`Corrupted manifest detected. Artifact ${id} not in manifest.`);
      }

      const compressedArtifact = await maybeCompressArtifact(artifact);
      if (!isCompressed(compressedArtifact)) {
        throw new Error(`Unable to compress artifact: ${id}`);
      } else if (!internalArtifactCompleteSchema.is(compressedArtifact)) {
        throw new Error(`Incomplete artifact detected: ${id}`);
      }
      this.addEntry(compressedArtifact);
    } catch (err) {
      return err;
    }
    return null;
  }

  public equals(manifest: Manifest): boolean {
    return this.getSha256() === manifest.getSha256();
  }

  public getSha256(): string {
    let sha256 = createHash('sha256');
    Object.keys(this.entries)
      .sort()
      .forEach((docId) => {
        sha256 = sha256.update(docId);
      });
    return sha256.digest('hex');
  }

  public getSchemaVersion(): ManifestSchemaVersion {
    return this.schemaVersion;
  }

  public getSoVersion(): string | undefined {
    return this.version;
  }

  public setSoVersion(version: string) {
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

  public getEntry(artifactId: string): ManifestEntry | undefined {
    return this.entries[artifactId];
  }

  public getArtifact(artifactId: string): InternalArtifactSchema | undefined {
    return this.getEntry(artifactId)?.getArtifact();
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
      manifest_version: this.getSha256(),
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
      ids: Object.keys(this.entries),
    };
  }
}
