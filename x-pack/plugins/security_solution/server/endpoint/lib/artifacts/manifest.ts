/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues } from 'lodash';
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
  private allEntries: Record<string, ManifestEntry>;
  private defaultEntries: Record<string, ManifestEntry>;
  private policySpecificEntries: Record<string, Record<string, ManifestEntry>>;
  private version: ManifestVersion;

  constructor(version?: Partial<ManifestVersion>) {
    this.allEntries = {};
    this.defaultEntries = {};
    this.policySpecificEntries = {};

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
      const existingArtifact = oldManifest.getArtifact(getArtifactId(artifact));
      if (existingArtifact) {
        manifest.addDefaultEntry(existingArtifact);
      } else {
        manifest.addDefaultEntry(artifact);
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
      this.replaceArtifact(compressedArtifact);
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

  public addDefaultEntry(artifact: InternalArtifactSchema) {
    const entry = new ManifestEntry(artifact);
    this.allEntries[entry.getDocId()] = entry;
    this.defaultEntries[entry.getDocId()] = entry;
  }

  public addPolicySpecificEntry(policyId: string, artifact: InternalArtifactSchema) {
    const entry = new ManifestEntry(artifact);
    this.allEntries[entry.getDocId()] = entry;
    this.policySpecificEntries[policyId] = this.policySpecificEntries[policyId] || {};
    this.policySpecificEntries[policyId][entry.getDocId()] = entry;
  }

  public replaceArtifact(artifact: InternalArtifactSchema) {
    const entry = new ManifestEntry(artifact);

    if (this.containsArtifact(entry.getDocId())) {
      this.allEntries[entry.getDocId()] = entry;
      this.defaultEntries[entry.getDocId()] = entry;
      Object.values(this.policySpecificEntries).forEach((entries) => {
        if (entry.getDocId() in entries) {
          entries[entry.getDocId()] = entry;
        }
      });
    }
  }

  public containsArtifact(artifactId: string): boolean {
    return artifactId in this.allEntries;
  }

  public getAllEntries(): Record<string, ManifestEntry> {
    return this.allEntries;
  }

  public getEntry(artifactId: string): ManifestEntry | undefined {
    return this.allEntries[artifactId];
  }

  public getArtifact(artifactId: string): InternalArtifactSchema | undefined {
    return this.getEntry(artifactId)?.getArtifact();
  }

  public diff(manifest: Manifest): ManifestDiff[] {
    const diffs: ManifestDiff[] = [];

    for (const id in manifest.getAllEntries()) {
      if (!this.containsArtifact(id)) {
        diffs.push({ type: 'delete', id });
      }
    }

    for (const id in this.getAllEntries()) {
      if (!manifest.containsArtifact(id)) {
        diffs.push({ type: 'add', id });
      }
    }

    return diffs;
  }

  public toPackagePolicyManifest(policyId?: string): ManifestSchema {
    const entries = (!!policyId && this.policySpecificEntries[policyId]) || this.defaultEntries;
    const manifestObj: ManifestSchema = {
      manifest_version: this.getSemanticVersion(),
      schema_version: this.getSchemaVersion(),
      artifacts: {},
    };

    for (const entry of Object.values(entries)) {
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
      defaultArtifactIds: Object.keys(this.defaultEntries),
      policySpecificArtifactIds: mapValues(this.policySpecificEntries, (value) =>
        Object.keys(value)
      ),
      schemaVersion: this.getSchemaVersion(),
      semanticVersion: this.getSemanticVersion(),
    };
  }
}
