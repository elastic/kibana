/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManifestEntry } from './manifest_entry';
import {
  InternalArtifactSchema,
  InternalManifestSchema,
  ManifestSchema,
  ManifestSchemaVersion,
} from '../../schemas/artifacts';

export interface ManifestDiff {
  type: string;
  id: string;
}

export class Manifest {
  private entries: ManifestEntry[];
  private schemaVersion: string;

  // For concurrency control
  private version: string | undefined;

  constructor(schemaVersion: string) {
    this.entries = [];
    this.schemaVersion = schemaVersion;
  }

  public static fromArtifacts(
    artifacts: InternalArtifactSchema[],
    schemaVersion: string
  ): Manifest {
    const manifest = new Manifest(schemaVersion);
    artifacts.forEach((artifact) => {
      manifest.addEntry(artifact);
    });
    return manifest;
  }

  public getSchemaVersion(): string {
    return this.schemaVersion;
  }

  public getVersion(): string | undefined {
    return this.version;
  }

  public setVersion(version: string | undefined) {
    this.version = version;
  }

  public addEntry(artifact: InternalArtifactSchema) {
    this.entries.push(new ManifestEntry(artifact));
  }

  public contains(artifact: InternalArtifactSchema): boolean {
    for (const entry of this.entries) {
      if (artifact.identifier === entry.getIdentifier() && artifact.sha256 === entry.getSha256()) {
        return true;
      }
    }
    return false;
  }

  public getEntries(): ManifestEntry[] {
    return this.entries;
  }

  public getArtifact(id: string): InternalArtifactSchema {
    for (const entry of this.entries) {
      if (entry.getDocId() === id) {
        return entry.getArtifact();
      }
    }
  }

  // Returns artifacts that are superceded in this manifest.
  public diff(manifest: Manifest): ManifestDiff[] {
    const diffs: string[] = [];

    for (const entry of manifest.getEntries()) {
      if (!this.contains(entry.getArtifact())) {
        diffs.push({ type: 'delete', id: entry.getDocId() });
      }
    }

    for (const entry of this.entries) {
      if (!manifest.contains(entry.getArtifact())) {
        diffs.push({ type: 'add', id: entry.getDocId() });
      }
    }

    return diffs;
  }

  public toEndpointFormat(): ManifestSchema {
    const manifestObj: object = {
      manifestVersion: 'todo',
      schemaVersion: 'todo',
      artifacts: {},
    };

    this.entries.forEach((entry) => {
      manifestObj.artifacts[entry.getIdentifier()] = entry.getRecord();
    });

    return manifestObj as ManifestSchema;
  }

  public toSavedObject(): InternalManifestSchema {
    return {
      schemaVersion: this.schemaVersion as ManifestSchemaVersion,
      ids: this.entries.map((entry) => entry.getDocId()),
    };
  }
}
