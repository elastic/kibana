/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';
import { validate } from '../../../../common/validate';
import {
  InternalArtifactSchema,
  InternalManifestSchema,
  internalArtifactCompleteSchema,
  InternalArtifactCompleteSchema,
} from '../../schemas/artifacts';
import {
  ManifestSchemaVersion,
  SemanticVersion,
  semanticVersion,
} from '../../../../common/endpoint/schema/common';
import { manifestSchema, ManifestSchema } from '../../../../common/endpoint/schema/manifest';
import { ManifestEntry } from './manifest_entry';
import { maybeCompressArtifact, isCompressed } from './lists';
import { getArtifactId } from './common';
import { ManifestVersion, manifestVersion } from '../../schemas/artifacts/manifest';

export interface ManifestDiff {
  type: string;
  id: string;
}

export class Manifest {
  private entries: Record<string, ManifestEntry>;
  private version: ManifestVersion;

  constructor(version?: Partial<ManifestVersion>) {
    this.entries = {};

    const decodedVersion = {
      schemaVersion: version?.schemaVersion ?? 'v1',
      semanticVersion: version?.semanticVersion ?? '1.0.0',
      soVersion: version?.soVersion,
    };

    const [validated, errors] = validate(decodedVersion, manifestVersion);
    if (errors != null || validated === null) {
      throw new Error(errors ?? 'Invalid version format.');
    }

    this.version = validated;
  }

  public static getDefault(schemaVersion?: ManifestSchemaVersion) {
    return new Manifest({ schemaVersion, semanticVersion: '1.0.0' });
  }

  public static fromArtifacts(
    artifacts: InternalArtifactCompleteSchema[],
    oldManifest: Manifest,
    schemaVersion?: ManifestSchemaVersion
  ): Manifest {
    const manifest = new Manifest({
      schemaVersion,
      semanticVersion: oldManifest.getSemanticVersion(),
      soVersion: oldManifest.getSavedObjectVersion(),
    });
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

  public bumpSemanticVersion() {
    const newSemanticVersion = semver.inc(this.getSemanticVersion(), 'patch');
    if (!semanticVersion.is(newSemanticVersion)) {
      throw new Error(`Invalid semver: ${newSemanticVersion}`);
    }
    this.version.semanticVersion = newSemanticVersion;
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

  public getSchemaVersion(): ManifestSchemaVersion {
    return this.version.schemaVersion;
  }

  public getSavedObjectVersion(): string | undefined {
    return this.version.soVersion;
  }

  public getSemanticVersion(): SemanticVersion {
    return this.version.semanticVersion;
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
      manifest_version: this.getSemanticVersion(),
      schema_version: this.getSchemaVersion(),
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
      ids: Object.keys(this.getEntries()),
      schemaVersion: this.getSchemaVersion(),
      semanticVersion: this.getSemanticVersion(),
    };
  }
}
